import json
import os
import logging
import httpx
import base64
import hashlib
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("glicomama-push")

_supabase_client = None
_scheduler = None

VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_CLAIMS = {"sub": "mailto:glicomama@noreply.com"}

# LibreLinkUp API configuration
LIBRE_REGIONS = {
    "eu": "https://api-eu.libreview.io",
    "us": "https://api-us.libreview.io",
    "eu2": "https://api-eu2.libreview.io",
    "ae": "https://api-ae.libreview.io",
    "ap": "https://api-ap.libreview.io",
    "au": "https://api-au.libreview.io",
    "de": "https://api-de.libreview.io",
    "fr": "https://api-fr.libreview.io",
    "jp": "https://api-jp.libreview.io",
    "la": "https://api-la.libreview.io",
}
LIBRE_HEADERS = {
    "Content-Type": "application/json",
    "product": "llu.android",
    "version": "4.12.0",
    "Accept-Encoding": "gzip",
}

# Simple encryption for storing LibreLinkUp credentials
ENCRYPTION_KEY = os.environ.get("LIBRE_ENCRYPTION_KEY", os.environ.get("SUPABASE_SERVICE_KEY", "default-key")[:32])


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


# ─── LibreLinkUp Integration ───────────────────────────────

def _encrypt_password(password: str) -> str:
    """Simple AES-like obfuscation for storing passwords."""
    key_bytes = hashlib.sha256(ENCRYPTION_KEY.encode()).digest()
    encoded = base64.b64encode(password.encode()).decode()
    # XOR with key for basic obfuscation
    result = []
    for i, c in enumerate(encoded):
        result.append(chr(ord(c) ^ key_bytes[i % len(key_bytes)]))
    return base64.b64encode(''.join(result).encode('latin-1')).decode()


def _decrypt_password(encrypted: str) -> str:
    """Reverse the obfuscation."""
    key_bytes = hashlib.sha256(ENCRYPTION_KEY.encode()).digest()
    decoded = base64.b64decode(encrypted).decode('latin-1')
    result = []
    for i, c in enumerate(decoded):
        result.append(chr(ord(c) ^ key_bytes[i % len(key_bytes)]))
    return base64.b64decode(''.join(result)).decode()


def libre_login(email: str, password: str, region: str = "eu") -> dict | None:
    """Login to LibreLinkUp API and return auth token + patient ID."""
    base_url = LIBRE_REGIONS.get(region, LIBRE_REGIONS["eu"])
    try:
        resp = httpx.post(
            f"{base_url}/llu/auth/login",
            headers=LIBRE_HEADERS,
            json={"email": email, "password": password},
            timeout=15,
        )
        data = resp.json()

        # Handle region redirect
        if data.get("status") == 2 and data.get("data", {}).get("redirect"):
            new_region = data["data"]["region"]
            new_url = LIBRE_REGIONS.get(new_region, f"https://api-{new_region}.libreview.io")
            resp = httpx.post(
                f"{new_url}/llu/auth/login",
                headers=LIBRE_HEADERS,
                json={"email": email, "password": password},
                timeout=15,
            )
            data = resp.json()
            region = new_region

        if data.get("status") != 0:
            logger.error(f"LibreLinkUp login failed: {data.get('error', data)}")
            return None

        auth_ticket = data.get("data", {}).get("authTicket", {})
        token = auth_ticket.get("token")
        if not token:
            logger.error("LibreLinkUp login: no token in response")
            return None

        return {"token": token, "region": region}
    except Exception as e:
        logger.error(f"LibreLinkUp login error: {e}")
        return None


def libre_get_connections(token: str, region: str) -> list:
    """Get patient connections from LibreLinkUp."""
    base_url = LIBRE_REGIONS.get(region, LIBRE_REGIONS["eu"])
    headers = {**LIBRE_HEADERS, "Authorization": f"Bearer {token}"}
    try:
        resp = httpx.get(f"{base_url}/llu/connections", headers=headers, timeout=15)
        data = resp.json()
        return data.get("data", []) or []
    except Exception as e:
        logger.error(f"LibreLinkUp connections error: {e}")
        return []


def libre_get_graph(token: str, region: str, patient_id: str) -> dict | None:
    """Get glucose graph data for a patient."""
    base_url = LIBRE_REGIONS.get(region, LIBRE_REGIONS["eu"])
    headers = {**LIBRE_HEADERS, "Authorization": f"Bearer {token}"}
    try:
        resp = httpx.get(
            f"{base_url}/llu/connections/{patient_id}/graph",
            headers=headers,
            timeout=15,
        )
        data = resp.json()
        return data.get("data", {})
    except Exception as e:
        logger.error(f"LibreLinkUp graph error: {e}")
        return None


def poll_libre_readings():
    """Poll LibreLinkUp for all connected users and store readings."""
    if not _supabase_client:
        return
    try:
        result = _supabase_client.table("libre_connections") \
            .select("*") \
            .eq("active", True) \
            .execute()
        connections = result.data or []
        if not connections:
            return

        for conn in connections:
            try:
                password = _decrypt_password(conn["encrypted_password"])
                login_result = libre_login(conn["libre_email"], password, conn.get("region", "eu"))
                if not login_result:
                    logger.warning(f"LibreLinkUp login failed for user {conn['user_id']}")
                    continue

                token = login_result["token"]
                region = login_result["region"]
                patient_id = conn.get("libre_patient_id", "")

                if not patient_id:
                    patients = libre_get_connections(token, region)
                    if patients:
                        patient_id = patients[0].get("patientId", "")
                        if patient_id:
                            _supabase_client.table("libre_connections") \
                                .update({"libre_patient_id": patient_id, "region": region}) \
                                .eq("id", conn["id"]).execute()

                if not patient_id:
                    continue

                graph_data = libre_get_graph(token, region, patient_id)
                if not graph_data:
                    continue

                readings = []
                # Current glucose reading
                connection_data = graph_data.get("connection", {})
                if connection_data and connection_data.get("glucoseMeasurement"):
                    gm = connection_data["glucoseMeasurement"]
                    readings.append({
                        "timestamp": gm.get("Timestamp") or gm.get("FactoryTimestamp", ""),
                        "glucose_value": gm.get("Value") or gm.get("ValueInMgPerDl", 0),
                        "trend": _parse_trend(gm.get("TrendArrow", 0)),
                        "source": "current",
                    })

                # Historical readings from graph
                for gm in graph_data.get("graphData", []):
                    readings.append({
                        "timestamp": gm.get("Timestamp") or gm.get("FactoryTimestamp", ""),
                        "glucose_value": gm.get("Value") or gm.get("ValueInMgPerDl", 0),
                        "trend": _parse_trend(gm.get("TrendArrow", 0)),
                        "source": "history",
                    })

                if not readings:
                    continue

                # Store new readings (upsert by user_id + timestamp)
                stored = 0
                for r in readings:
                    ts = r["timestamp"]
                    if not ts or not r["glucose_value"]:
                        continue
                    # Parse LibreLinkUp timestamp format: "M/D/YYYY H:MM:SS AM/PM"
                    parsed_ts = _parse_libre_timestamp(ts)
                    if not parsed_ts:
                        continue

                    # Check if reading already exists
                    existing = _supabase_client.table("libre_readings") \
                        .select("id") \
                        .eq("user_id", conn["user_id"]) \
                        .eq("timestamp", parsed_ts) \
                        .execute()
                    if existing.data:
                        continue

                    _supabase_client.table("libre_readings").insert({
                        "user_id": conn["user_id"],
                        "timestamp": parsed_ts,
                        "glucose_value": r["glucose_value"],
                        "trend": r["trend"],
                        "source": r["source"],
                    }).execute()
                    stored += 1

                if stored > 0:
                    logger.info(f"Stored {stored} new Libre readings for user {conn['user_id']}")

                # Update last_sync
                _supabase_client.table("libre_connections") \
                    .update({"last_sync": datetime.now(timezone.utc).isoformat()}) \
                    .eq("id", conn["id"]).execute()

            except Exception as e:
                logger.error(f"Libre poll error for user {conn.get('user_id', '?')}: {e}")
    except Exception as e:
        logger.error(f"Libre poll global error: {e}")


def _parse_trend(arrow: int) -> str:
    """Convert LibreLinkUp trend arrow to string."""
    trends = {
        1: "falling_fast",
        2: "falling",
        3: "stable",
        4: "rising",
        5: "rising_fast",
    }
    return trends.get(arrow, "unknown")


def _parse_libre_timestamp(ts: str) -> str | None:
    """Parse LibreLinkUp timestamp to ISO format."""
    formats = [
        "%m/%d/%Y %I:%M:%S %p",
        "%d/%m/%Y %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%m/%d/%Y %H:%M:%S",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(ts, fmt)
            return dt.isoformat() + "Z"
        except ValueError:
            continue
    # Already ISO?
    if "T" in ts:
        return ts if ts.endswith("Z") else ts + "Z"
    return None


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
        _scheduler.add_job(poll_libre_readings, "interval", minutes=5)
        _scheduler.start()
        logger.info("Scheduler started — polling every 30s, keep-alive every 13min, Libre every 5min")
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
        "libre": True,
    }


# ─── LibreLinkUp API Endpoints ─────────────────────────────

class LibreConnectRequest(BaseModel):
    user_id: str
    email: str
    password: str
    region: str = "eu"


class LibreDisconnectRequest(BaseModel):
    user_id: str


class LibreStatusRequest(BaseModel):
    user_id: str


class LibreReadingsRequest(BaseModel):
    user_id: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None


@app.post("/api/libre/connect")
def libre_connect(req: LibreConnectRequest):
    """Connect a user's LibreLinkUp account. Only tests login + saves credentials.
    Initial data sync happens via the background scheduler (every 5 min)."""
    if not _supabase_client:
        raise HTTPException(500, "Supabase não configurado. Contate o suporte.")

    # Test login
    try:
        login_result = libre_login(req.email, req.password, req.region)
    except Exception as e:
        logger.error(f"LibreLinkUp login exception: {e}")
        raise HTTPException(502, f"Erro ao comunicar com LibreLinkUp: {e}")

    if not login_result:
        raise HTTPException(401, "Falha ao conectar com LibreLinkUp. Verifique email e senha.")

    token = login_result["token"]
    region = login_result["region"]

    # Get patient connections (quick call)
    patient_id = ""
    patient_name = ""
    try:
        patients = libre_get_connections(token, region)
        if patients:
            patient_id = patients[0].get("patientId", "")
            p = patients[0]
            patient_name = f"{p.get('firstName', '')} {p.get('lastName', '')}".strip()
    except Exception as e:
        logger.warning(f"Could not fetch patient connections: {e}")

    # Encrypt password and save
    encrypted = _encrypt_password(req.password)

    try:
        existing = _supabase_client.table("libre_connections") \
            .select("id") \
            .eq("user_id", req.user_id) \
            .execute()

        conn_data = {
            "user_id": req.user_id,
            "libre_email": req.email,
            "encrypted_password": encrypted,
            "region": region,
            "libre_patient_id": patient_id,
            "patient_name": patient_name,
            "active": True,
        }

        if existing.data:
            _supabase_client.table("libre_connections") \
                .update(conn_data) \
                .eq("id", existing.data[0]["id"]).execute()
        else:
            _supabase_client.table("libre_connections").insert(conn_data).execute()

        logger.info(f"LibreLinkUp connected for user {req.user_id}, region={region}")

        return {
            "status": "connected",
            "region": region,
            "patient_name": patient_name,
            "patient_id": patient_id,
            "message": "Conectado! As leituras serão sincronizadas em até 5 minutos.",
        }
    except Exception as e:
        logger.error(f"Libre connect DB error: {e}")
        raise HTTPException(500, f"Erro ao salvar conexão: {e}")


@app.post("/api/libre/disconnect")
def libre_disconnect(req: LibreDisconnectRequest):
    """Disconnect a user's LibreLinkUp account."""
    if not _supabase_client:
        raise HTTPException(500, "Supabase not configured")
    try:
        _supabase_client.table("libre_connections") \
            .update({"active": False}) \
            .eq("user_id", req.user_id).execute()
        return {"status": "disconnected"}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/libre/status")
def libre_status(req: LibreStatusRequest):
    """Check LibreLinkUp connection status for a user."""
    if not _supabase_client:
        raise HTTPException(500, "Supabase not configured")
    try:
        result = _supabase_client.table("libre_connections") \
            .select("active, region, patient_name, last_sync, libre_email") \
            .eq("user_id", req.user_id) \
            .eq("active", True) \
            .execute()
        if result.data:
            conn = result.data[0]
            return {
                "connected": True,
                "email": conn["libre_email"],
                "region": conn.get("region", "eu"),
                "patient_name": conn.get("patient_name", ""),
                "last_sync": conn.get("last_sync", ""),
            }
        return {"connected": False}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/libre/sync")
def libre_force_sync(req: LibreStatusRequest):
    """Force an immediate sync of Libre readings for a user."""
    if not _supabase_client:
        raise HTTPException(500, "Supabase não configurado")

    # 1. Get connection
    try:
        result = _supabase_client.table("libre_connections") \
            .select("*") \
            .eq("user_id", req.user_id) \
            .eq("active", True) \
            .execute()
    except Exception as e:
        logger.error(f"Sync: DB query error: {e}")
        raise HTTPException(500, f"Erro ao buscar conexão no banco: {e}")

    if not result.data:
        raise HTTPException(404, "Nenhuma conexão LibreLinkUp ativa. Configure em CGM Libre → Configurar.")

    conn = result.data[0]

    # 2. Decrypt and login
    try:
        password = _decrypt_password(conn["encrypted_password"])
    except Exception as e:
        logger.error(f"Sync: decrypt error: {e}")
        raise HTTPException(500, "Erro ao descriptografar credenciais. Reconecte sua conta.")

    try:
        login_result = libre_login(conn["libre_email"], password, conn.get("region", "eu"))
    except Exception as e:
        logger.error(f"Sync: login exception: {e}")
        raise HTTPException(502, f"Erro ao comunicar com LibreLinkUp: {e}")

    if not login_result:
        raise HTTPException(401, "Falha ao autenticar com LibreLinkUp. Verifique suas credenciais ou reconecte.")

    token = login_result["token"]
    region = login_result["region"]
    patient_id = conn.get("libre_patient_id", "")

    # 3. Get patient ID if missing
    if not patient_id:
        try:
            patients = libre_get_connections(token, region)
            if patients:
                patient_id = patients[0].get("patientId", "")
                if patient_id:
                    _supabase_client.table("libre_connections") \
                        .update({"libre_patient_id": patient_id, "region": region}) \
                        .eq("id", conn["id"]).execute()
        except Exception as e:
            logger.error(f"Sync: get connections error: {e}")

    if not patient_id:
        raise HTTPException(404, "Nenhum sensor/paciente encontrado no LibreLinkUp. Verifique se o compartilhamento está ativo no app FreeStyle Libre.")

    # 4. Get graph data
    try:
        graph_data = libre_get_graph(token, region, patient_id)
    except Exception as e:
        logger.error(f"Sync: graph error: {e}")
        raise HTTPException(502, f"Erro ao buscar dados do sensor: {e}")

    if not graph_data:
        raise HTTPException(502, "LibreLinkUp retornou dados vazios. Tente novamente em alguns minutos.")

    # 5. Parse and store readings
    stored = 0
    all_readings = []
    connection_data = graph_data.get("connection", {})
    if connection_data and connection_data.get("glucoseMeasurement"):
        gm = connection_data["glucoseMeasurement"]
        all_readings.append({
            "timestamp": gm.get("Timestamp") or gm.get("FactoryTimestamp", ""),
            "glucose_value": gm.get("Value") or gm.get("ValueInMgPerDl", 0),
            "trend": _parse_trend(gm.get("TrendArrow", 0)),
            "source": "current",
        })
    for gm in graph_data.get("graphData", []):
        all_readings.append({
            "timestamp": gm.get("Timestamp") or gm.get("FactoryTimestamp", ""),
            "glucose_value": gm.get("Value") or gm.get("ValueInMgPerDl", 0),
            "trend": _parse_trend(gm.get("TrendArrow", 0)),
            "source": "history",
        })

    logger.info(f"Sync: found {len(all_readings)} readings for user {req.user_id}")

    for r in all_readings:
        parsed_ts = _parse_libre_timestamp(r["timestamp"])
        if not parsed_ts or not r["glucose_value"]:
            continue
        try:
            existing = _supabase_client.table("libre_readings") \
                .select("id") \
                .eq("user_id", req.user_id) \
                .eq("timestamp", parsed_ts) \
                .execute()
            if existing.data:
                continue
            _supabase_client.table("libre_readings").insert({
                "user_id": req.user_id,
                "timestamp": parsed_ts,
                "glucose_value": r["glucose_value"],
                "trend": r["trend"],
                "source": r["source"],
            }).execute()
            stored += 1
        except Exception as e:
            logger.warning(f"Sync: insert error for ts={parsed_ts}: {e}")

    _supabase_client.table("libre_connections") \
        .update({"last_sync": datetime.now(timezone.utc).isoformat()}) \
        .eq("id", conn["id"]).execute()

    logger.info(f"Sync complete: {stored} new readings for user {req.user_id}")
    return {"status": "synced", "new_readings": stored}


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
