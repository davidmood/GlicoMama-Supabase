import json
import os
import logging
import httpx
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("glicomama-push")

_supabase_client = None
_scheduler = None

VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_CLAIMS = {"sub": "mailto:glicomama@noreply.com"}


def _init_supabase():
    global _supabase_client
    try:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL", "https://obdnpizktbutnphbakog.supabase.co")
        key = os.environ.get("SUPABASE_SERVICE_KEY", "")
        if not key:
            logger.warning("SUPABASE_SERVICE_KEY not set")
            return
        _supabase_client = create_client(url, key)
        logger.info("Supabase initialized")
    except Exception as e:
        logger.error(f"Supabase init error: {e}")


def send_push(subscription_json: str, title: str, body: str) -> bool:
    """Send push notification using standard Web Push protocol."""
    if not VAPID_PRIVATE_KEY:
        logger.error("VAPID_PRIVATE_KEY not set")
        return False
    try:
        from pywebpush import webpush, WebPushException
        subscription_info = json.loads(subscription_json)
        webpush(
            subscription_info=subscription_info,
            data=json.dumps({"title": title, "body": body}),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS,
        )
        endpoint = subscription_info.get("endpoint", "")
        logger.info(f"Push sent to endpoint={endpoint[:60]}...")
        return True
    except Exception as e:
        logger.error(f"Web Push send error: {e}")
        return False


def poll_scheduled_notifications():
    if not _supabase_client:
        return
    try:
        now = datetime.now(timezone.utc).isoformat()
        result = _supabase_client.table("scheduled_notifications") \
            .select("*") \
            .lte("fire_at", now) \
            .eq("sent", False) \
            .execute()

        rows = result.data or []
        if rows:
            logger.info(f"Found {len(rows)} pending notification(s)")

        for row in rows:
            token = row["fcm_token"]
            ok = send_push(token, row["title"], row["body"])
            _supabase_client.table("scheduled_notifications") \
                .update({"sent": True}) \
                .eq("id", row["id"]) \
                .execute()
            if ok:
                logger.info(f"Notification {row['id']} sent")
            else:
                logger.warning(f"Notification {row['id']} failed, marked sent")

            # Auto-reschedule recurring reminders for next day
            reminder_id = row.get("reminder_id")
            if reminder_id:
                next_fire = datetime.fromisoformat(row["fire_at"].replace("Z", "+00:00")) + timedelta(days=1)
                _supabase_client.table("scheduled_notifications").insert({
                    "fcm_token": token,
                    "title": row["title"],
                    "body": row["body"],
                    "fire_at": next_fire.isoformat(),
                    "sent": False,
                    "reminder_id": reminder_id,
                }).execute()
                logger.info(f"Rescheduled reminder {reminder_id} for {next_fire.isoformat()}")
    except Exception as e:
        logger.error(f"Poll error: {e}")


def keep_alive():
    """Ping self to prevent Render free tier from sleeping."""
    try:
        render_url = os.environ.get("RENDER_EXTERNAL_URL", "")
        if render_url:
            httpx.get(f"{render_url}/health", timeout=10)
            logger.debug("Keep-alive ping sent")
    except Exception:
        pass


@asynccontextmanager
async def lifespan(a: FastAPI):
    global _scheduler
    _init_supabase()
    if not VAPID_PRIVATE_KEY:
        logger.warning("VAPID_PRIVATE_KEY not set — push notifications will fail")
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        _scheduler = BackgroundScheduler()
        _scheduler.add_job(poll_scheduled_notifications, "interval", seconds=30)
        _scheduler.add_job(keep_alive, "interval", minutes=13)
        _scheduler.start()
        logger.info("Scheduler started — polling every 30s, keep-alive every 13min")
    except Exception as e:
        logger.error(f"Scheduler error: {e}")
    yield
    if _scheduler:
        _scheduler.shutdown()


app = FastAPI(title="GlicoMama Push", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScheduleRequest(BaseModel):
    fcm_token: str
    title: str
    body: str
    fire_at: str


class TestRequest(BaseModel):
    fcm_token: str


class SaveTokenRequest(BaseModel):
    user_id: str
    fcm_token: str


class ReminderSync(BaseModel):
    id: str
    time: str
    label: str
    enabled: bool


class SyncRemindersRequest(BaseModel):
    user_id: str
    fcm_token: str
    reminders: list[ReminderSync]
    tz_offset_minutes: int


@app.get("/health")
def health():
    return {
        "status": "ok",
        "supabase": bool(_supabase_client),
        "vapid": bool(VAPID_PRIVATE_KEY),
    }


@app.post("/api/schedule")
def schedule_notification(req: ScheduleRequest):
    if not _supabase_client:
        raise HTTPException(500, "Supabase not configured")
    try:
        _supabase_client.table("scheduled_notifications").insert({
            "fcm_token": req.fcm_token,
            "title": req.title,
            "body": req.body,
            "fire_at": req.fire_at,
            "sent": False,
        }).execute()
        return {"status": "scheduled", "fire_at": req.fire_at}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/test")
def test_notification(req: TestRequest):
    ok = send_push(
        req.fcm_token,
        "GlicoMama - Teste",
        "As notificações push estão funcionando!",
    )
    if not ok:
        raise HTTPException(500, "Falha ao enviar notificação push")
    return {"status": "sent"}


@app.post("/api/save-token")
def save_token(req: SaveTokenRequest):
    if not _supabase_client:
        raise HTTPException(500, "Supabase not configured")
    try:
        _supabase_client.table("profiles").update({
            "fcm_token": req.fcm_token,
        }).eq("id", req.user_id).execute()
        return {"status": "saved"}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/sync-reminders")
def sync_reminders(req: SyncRemindersRequest):
    """Sync recurring reminders: cancel old, schedule enabled ones."""
    if not _supabase_client:
        raise HTTPException(500, "Supabase not configured")
    try:
        # Delete all pending recurring notifications for this user's token
        existing = _supabase_client.table("scheduled_notifications") \
            .select("id, reminder_id") \
            .eq("sent", False) \
            .not_.is_("reminder_id", "null") \
            .eq("fcm_token", req.fcm_token) \
            .execute()
        for row in existing.data or []:
            _supabase_client.table("scheduled_notifications") \
                .delete().eq("id", row["id"]).execute()

        # Schedule enabled reminders
        now_utc = datetime.now(timezone.utc)
        tz_delta = timedelta(minutes=req.tz_offset_minutes)
        scheduled_count = 0

        for rem in req.reminders:
            if not rem.enabled:
                continue
            parts = rem.time.split(":")
            if len(parts) != 2:
                continue
            hour, minute = int(parts[0]), int(parts[1])

            # Calculate next fire time in UTC
            user_now = now_utc + tz_delta
            fire_local = user_now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if fire_local <= user_now:
                fire_local += timedelta(days=1)
            fire_utc = fire_local - tz_delta

            _supabase_client.table("scheduled_notifications").insert({
                "fcm_token": req.fcm_token,
                "title": "GlicoMama - Lembrete",
                "body": f"\u23f0 {rem.time} \u2014 {rem.label}",
                "fire_at": fire_utc.isoformat(),
                "sent": False,
                "reminder_id": rem.id,
            }).execute()
            scheduled_count += 1

        return {"status": "synced", "scheduled": scheduled_count}
    except Exception as e:
        logger.error(f"Sync reminders error: {e}")
        raise HTTPException(500, str(e))
