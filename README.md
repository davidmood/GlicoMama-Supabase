# GlicoMama 💜

**App completo de controle de glicemia gestacional e amamentação — agora na nuvem.**

PWA (Progressive Web App) com autenticação, banco de dados na nuvem, notificações push reais, compartilhamento de dados com médicos e familiares via QR Code, e muito mais.

> **Evolução da [versão offline](https://github.com/davidmood/GlicoMama)** — agora com Supabase, push notifications e compartilhamento médico.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Funcionalidades](#funcionalidades)
3. [Arquitetura](#arquitetura)
4. [Stack Tecnológico](#stack-tecnológico)
5. [Integrações](#integrações)
6. [Estrutura do Projeto](#estrutura-do-projeto)
7. [Setup Local](#setup-local)
8. [Deploy](#deploy)
9. [Banco de Dados](#banco-de-dados)
10. [Diferenciais](#diferenciais)

---

## Visão Geral

O GlicoMama é um app para **gestantes e lactantes** acompanharem sua glicemia, uso de insulina e amamentação. Projetado para uso diário, funciona como um app nativo quando instalado na tela de início do celular.

### Por que GlicoMama?

- **Gestantes com diabetes gestacional** precisam registrar glicemia pré e pós-refeição múltiplas vezes ao dia
- **Médicos e familiares** precisam visualizar esses dados para acompanhamento
- Apps existentes são genéricos, em inglês, ou não cobrem amamentação
- O GlicoMama é 100% em português, gratuito e focado no público gestacional/lactante

---

## Funcionalidades

### Registro Completo de Saúde
- **Glicemia**: pré-prandial, pós 1h e pós 2h por refeição
- **Insulina**: tipo (basal/rápida), dose (UI), local de aplicação
- **Refeição**: tipo (café, almoço, jantar, lanche, ceia), carboidratos (g), descrição dos alimentos
- **Amamentação**: peito, bomba ou ambos
- **Detalhes**: lado do peito, duração, quantidade extraída (ml)
- **Bebê**: humor e qualidade do sono
- **Extras**: sintomas, observações livres
- **Correção de hipoglicemia**: registro específico para episódios

### Dashboard Interativo
- Média glicêmica e percentual no alvo
- Gráfico de tendência glicêmica (1d, 7d, 14d, 30d)
- Gráfico donut de distribuição (baixa, meta, atenção, alta)
- Widget "Última Mama" com timer
- Calendário mensal com dias marcados
- Registros recentes com edição e exclusão inline

### Gráficos e Estatísticas
- Tendência de glicemia (pré, pós 1h, pós 2h) — range dinâmico
- Glicemia por tipo de refeição
- Relação glicemia × amamentação
- Insulina × carboidratos (eixo duplo)
- Filtro por período com navegação entre dias

### Relatórios e Exportação
- Exportar para **PDF** com tabela formatada, estatísticas e resumo
- Exportar para **CSV** (compatível com Excel/Google Sheets)
- Exportação disponível tanto para paciente quanto para médico/familiar

### Sistema de Compartilhamento (Médico/Familiar)
- **QR Code + Código**: paciente gera código único (`GLM-XXXXXX`) com QR Code
- **Vínculo seguro**: médico ou familiar digita o código para vincular
- **Código expira em 24h** — segurança contra uso indevido
- **Perfis**: Paciente, Médico, Familiar/Cônjuge
- **Visualização read-only**: médico/familiar vê gráficos, tendências e registros
- **Busca por paciente**: nome ou CPF, pensando em médicos com muitos pacientes
- **Revogação de acesso**: paciente pode remover acesso a qualquer momento

### Notificações Push Reais
- **Funciona com app fechado** — via Web Push API + backend
- **Lembrete pós 1h e 2h**: ao criar registro com lembrete, agenda push automático
- **Lembretes recorrentes**: configure horários fixos (ex: "Medir às 7h") — dispara todo dia
- **Compatível com iOS 16.4+** (PWA instalado na tela de início) e Android

### Onboarding Personalizado
- Boas-vindas com nome
- Seleção de perfil: Paciente / Médico / Familiar
- Paciente: configura fase (gestação/pós-parto/amamentação), sensor e insulina
- Médico/Familiar: pula etapas não relevantes (3 passos vs 6)
- Configuração de faixas de glicemia personalizáveis

### Outras Funcionalidades
- **Autenticação** com email/senha via Supabase Auth
- **Dados na nuvem** — acesse de qualquer dispositivo
- **Modo escuro** (padrão) e modo claro
- **PWA** — instale no celular como app nativo
- **Backup manual** — exportar/importar JSON
- **Importação da versão antiga** — migra dados do GlicoMama offline
- **Disclaimer médico** — aviso de que o app não substitui acompanhamento profissional
- **Layout responsivo** — funciona no celular e desktop

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (PWA)                            │
│  React 19 + TypeScript + Vite + Chart.js                    │
│  Hospedado no Vercel                                        │
│  https://glico-mama-supabase.vercel.app                     │
└──────────────┬──────────────────────┬───────────────────────┘
               │                      │
               ▼                      ▼
┌──────────────────────┐  ┌───────────────────────────────────┐
│     SUPABASE         │  │       BACKEND (Push API)          │
│  PostgreSQL + Auth   │  │   FastAPI + Python                │
│  RLS Policies        │  │   Hospedado no Render             │
│  Real-time           │  │   https://glicomama-supabase      │
│                      │  │         .onrender.com             │
│  Tabelas:            │  │                                   │
│  - profiles          │  │   Funcionalidades:                │
│  - glucose_records   │  │   - Enviar push via Web Push API  │
│  - reminders         │  │   - Polling de notificações       │
│  - share_codes       │  │   - Keep-alive (anti-sleep)       │
│  - patient_links     │  │   - Sync de lembretes             │
│  - scheduled_notif.  │  │                                   │
└──────────────────────┘  └───────────────────────────────────┘
```

---

## Stack Tecnológico

### Frontend

| Tecnologia | Versão | Uso |
|---|---|---|
| **React** | 19 | UI framework |
| **TypeScript** | 6 | Tipagem estática |
| **Vite** | 8 | Build tool + dev server |
| **Chart.js** | 4.5 | Gráficos (tendência, donut, barras) |
| **react-chartjs-2** | 5.3 | Wrapper React para Chart.js |
| **date-fns** | 4.1 | Manipulação de datas |
| **Lucide React** | 1.14 | Ícones (300+ ícones SVG) |
| **jsPDF** | 4.2 | Geração de PDF |
| **jspdf-autotable** | 5.0 | Tabelas formatadas no PDF |
| **qrcode** | 1.5 | Geração de QR Code |
| **Supabase JS** | 2.105 | Cliente Supabase (auth, db, realtime) |
| **idb** | 8.0 | IndexedDB wrapper (fallback offline) |

### Backend (Push Notifications)

| Tecnologia | Uso |
|---|---|
| **Python** | 3.11+ |
| **FastAPI** | API REST async |
| **pywebpush** | Envio de Web Push notifications |
| **APScheduler** | Agendamento de tarefas (polling, keep-alive) |
| **Supabase Python** | Cliente Supabase para ler notificações agendadas |
| **uvicorn** | Servidor ASGI |
| **httpx** | HTTP client async (keep-alive pings) |
| **uv** | Gerenciador de pacotes Python (rápido) |

### Infraestrutura

| Serviço | Uso | Plano |
|---|---|---|
| **Vercel** | Hospedagem do frontend (PWA) | Gratuito |
| **Supabase** | Banco de dados PostgreSQL + Auth | Gratuito (500MB, 50K MAU) |
| **Render** | Hospedagem do backend (Push API) | Gratuito (750h/mês) |
| **Firebase** | Credenciais VAPID para Web Push | Gratuito |

---

## Integrações

### Vercel (Frontend)

O frontend é um SPA (Single Page Application) hospedado no Vercel com deploy automático a cada push na `main`.

- **URL**: Configurada no projeto Vercel
- **Build**: `npm run build` → gera `dist/`
- **Framework**: Vite
- **Variáveis de ambiente**:
  - `VITE_SUPABASE_URL` — URL do projeto Supabase
  - `VITE_SUPABASE_ANON_KEY` — Chave pública do Supabase
  - `VITE_PUSH_API_URL` — URL do backend no Render
  - `VITE_VAPID_PUBLIC_KEY` — Chave pública VAPID para Web Push

### Supabase (Banco de Dados + Auth)

PostgreSQL gerenciado com Row Level Security (RLS) para segurança por usuário.

- **Auth**: Email/senha com confirmação
- **Tabelas**: `profiles`, `glucose_records`, `reminders`, `share_codes`, `patient_links`, `scheduled_notifications`
- **RLS**: Cada usuário só acessa seus próprios dados; médicos/familiares acessam dados vinculados via `patient_links`
- **SQL files**: `supabase-schema.sql`, `supabase-push-notifications.sql`, `supabase-doctor-sharing.sql`

### Render (Backend Push API)

Backend Python/FastAPI que roda 24/7 para enviar notificações push.

- **Endpoint `/api/test`**: Envia notificação push de teste
- **Endpoint `/api/schedule`**: Agenda notificação para horário futuro
- **Endpoint `/api/reminders/sync`**: Sincroniza lembretes recorrentes
- **Polling**: A cada 30s, verifica `scheduled_notifications` e envia as pendentes
- **Keep-alive**: Pinga a si mesmo a cada 13min para não dormir no plano gratuito
- **Variáveis de ambiente**:
  - `SUPABASE_URL` — URL do Supabase
  - `SUPABASE_SERVICE_KEY` — Service role key (acesso admin)
  - `VAPID_PRIVATE_KEY` — Chave privada VAPID
  - `VAPID_CLAIMS_EMAIL` — Email para VAPID claims

### Firebase (VAPID Keys)

Usado apenas para gerar o par de chaves VAPID (pública/privada) para Web Push. O Firebase SDK **não** é usado — as notificações são enviadas via Web Push API padrão.

---

## Estrutura do Projeto

```
GlicoMama-Supabase/
├── public/
│   ├── sw.js                    # Service Worker (push + cache)
│   ├── manifest.json            # PWA manifest
│   └── icons/                   # Ícones do app (192x192, 512x512)
│
├── src/
│   ├── App.tsx                  # Componente raiz (routing, auth, estado)
│   ├── main.tsx                 # Entry point
│   ├── index.css                # Estilos globais (tema claro/escuro)
│   │
│   ├── components/
│   │   ├── Calendar.tsx         # Calendário mensal interativo
│   │   ├── Disclaimer.tsx       # Banner de aviso médico
│   │   ├── NewRecordModal.tsx   # Modal de novo registro (6 abas)
│   │   ├── Onboarding.tsx       # Wizard de primeiro acesso (3-6 passos)
│   │   ├── Sidebar.tsx          # Menu lateral (adaptativo por perfil)
│   │   └── Toast.tsx            # Notificações in-app
│   │
│   ├── pages/
│   │   ├── AuthPage.tsx         # Login / Cadastro
│   │   ├── DashboardPage.tsx    # Tela principal com resumo
│   │   ├── RecordsPage.tsx      # Lista de registros com filtros
│   │   ├── ChartsPage.tsx       # Gráficos e estatísticas
│   │   ├── ReportsPage.tsx      # Relatórios (PDF, CSV)
│   │   ├── GoalsPage.tsx        # Metas de glicemia
│   │   ├── RemindersPage.tsx    # Lembretes configuráveis
│   │   ├── ProfilePage.tsx      # Perfil (nome, CPF, CRM, fase)
│   │   ├── SettingsPage.tsx     # Configurações (tema, backup, dados)
│   │   ├── SharePage.tsx        # Gerar QR Code / Adicionar paciente
│   │   ├── PatientsPage.tsx     # Lista de pacientes (médico/familiar)
│   │   └── PatientDetailPage.tsx # Visualização do paciente (read-only)
│   │
│   ├── services/
│   │   ├── supabase.ts          # Cliente Supabase (config)
│   │   ├── database.ts          # CRUD de registros e settings
│   │   ├── notifications.ts     # Web Push + notificações locais
│   │   ├── sharing.ts           # Compartilhamento (QR, códigos, links)
│   │   ├── export.ts            # Exportação CSV e PDF
│   │   ├── backup.ts            # Backup/restauração JSON
│   │   └── firebase.ts          # Config Firebase (apenas VAPID)
│   │
│   └── types/
│       └── index.ts             # Tipos TypeScript (GlucoseRecord, etc.)
│
├── backend/
│   ├── main.py                  # FastAPI app (push notifications)
│   ├── pyproject.toml           # Dependências Python
│   ├── Dockerfile               # Container para deploy
│   └── render.yaml              # Configuração do Render
│
├── supabase-schema.sql          # Schema inicial do banco
├── supabase-push-notifications.sql  # Tabela de notificações agendadas
├── supabase-doctor-sharing.sql  # Tabelas de compartilhamento
├── supabase-fix-rls.sql         # Correções de RLS policies
└── supabase-add-reminder-id.sql # Migração: coluna reminder_id
```

---

## Setup Local

### Pré-requisitos

| Software | Versão | Download |
|---|---|---|
| **Node.js** | 18+ | https://nodejs.org |
| **npm** | 9+ | Incluso no Node.js |
| **Git** | 2+ | https://git-scm.com |

### 1. Clonar e instalar

```bash
git clone https://github.com/davidmood/GlicoMama-Supabase.git
cd GlicoMama-Supabase
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
VITE_PUSH_API_URL=https://seu-backend.onrender.com
VITE_VAPID_PUBLIC_KEY=sua-chave-vapid-publica
```

### 3. Rodar em desenvolvimento

```bash
npm run dev
# Acesse http://localhost:5173
```

### 4. Build para produção

```bash
npm run build
npm run preview  # Testar o build localmente
```

### 5. Backend (opcional, para push notifications)

```bash
cd backend
pip install uv
uv sync
uvicorn main:app --reload
```

---

## Deploy

### Frontend → Vercel

1. Conecte o repositório no [Vercel](https://vercel.com)
2. Configure as variáveis de ambiente (`.env` acima)
3. Deploy automático a cada push na `main`

### Backend → Render

1. Crie um **Web Service** no [Render](https://render.com)
2. Conecte o repositório, **Root Directory**: `backend`
3. Configure variáveis de ambiente:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_CLAIMS_EMAIL`
4. Deploy automático

### Banco de Dados → Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute os SQL files na ordem:
   1. `supabase-schema.sql` — schema base
   2. `supabase-push-notifications.sql` — notificações
   3. `supabase-doctor-sharing.sql` — compartilhamento
3. Copie as chaves (anon key + service role key)

---

## Banco de Dados

### Tabelas

| Tabela | Descrição |
|---|---|
| `profiles` | Perfil do usuário (nome, fase, sensor, insulina, role, CPF, CRM) |
| `glucose_records` | Registros de glicemia, insulina, amamentação |
| `reminders` | Lembretes configuráveis (horário, ativo/inativo) |
| `share_codes` | Códigos temporários de compartilhamento (GLM-XXXXXX, 24h) |
| `patient_links` | Vínculo permanente médico/familiar → paciente |
| `scheduled_notifications` | Notificações push agendadas (1h, 2h, lembretes) |

### Row Level Security (RLS)

Todas as tabelas têm RLS ativado:

- **Paciente**: lê e escreve apenas seus próprios dados
- **Médico/Familiar**: lê dados de pacientes vinculados via `patient_links` (read-only)
- **Service Role**: acesso total (usado pelo backend para enviar push)

---

## Diferenciais

### vs. Versão Anterior (GlicoMama Offline)

| Feature | V1 (Offline) | V2 (Supabase) |
|---|---|---|
| Armazenamento | IndexedDB (local) | PostgreSQL na nuvem |
| Autenticação | Nenhuma | Email/senha (Supabase Auth) |
| Acesso multi-dispositivo | Não | Sim |
| Notificações push | Apenas com app aberto | Com app fechado (Web Push) |
| Compartilhamento | Não | QR Code + código para médico/familiar |
| Backup | Manual (JSON) | Automático na nuvem |
| Lembretes | Visual (sem alerta) | Push notification real |

### vs. Outros Apps de Glicemia

| Feature | GlicoMama | Apps genéricos |
|---|---|---|
| Foco gestacional | Sim | Não |
| Amamentação integrada | Sim | Não |
| Português BR | Sim | Geralmente inglês |
| Gratuito (sem plano) | Sim | Freemium |
| PWA (sem App Store) | Sim | Geralmente app nativo |
| Compartilhamento com médico | QR Code | Geralmente não |
| Open Source | Sim | Não |
| Insulina basal + rápida | Sim | Parcial |
| Humor/sono do bebê | Sim | Não |

### Funcionalidades Únicas

- **Onboarding inteligente**: detecta se é paciente ou médico e adapta o fluxo
- **QR Code de compartilhamento**: gera código seguro com expiração de 24h
- **Visualização médica**: gráficos, tendências e registros do paciente em tempo real
- **Lembretes push recorrentes**: "Medir às 7h" dispara push todo dia, mesmo com app fechado
- **Importação da versão offline**: migra dados do GlicoMama V1 sem perda
- **Keep-alive inteligente**: backend no Render gratuito nunca dorme

---

## Instalando como PWA

### iPhone (iOS 16.4+)
1. Abra o app no **Safari**
2. Toque no botão de compartilhar (↑)
3. **"Adicionar à Tela de Início"**
4. Permita notificações quando solicitado

### Android (Chrome)
1. Abra o app no **Chrome**
2. Toque no menu (⋮) → **"Instalar app"**
3. Permita notificações

---

## Campos do Registro

| Campo | Tipo | Descrição |
|---|---|---|
| `timestamp` | datetime | Data e hora do registro |
| `meal_type` | enum | Café, Almoço, Jantar, Lanche, Ceia, Insulina Basal, Correção |
| `glucose_pre` | number | Glicemia pré-prandial (mg/dL) |
| `glucose_pos_1h` | number | Glicemia pós 1 hora |
| `glucose_pos_2h` | number | Glicemia pós 2 horas |
| `insulin_applied` | number | Dose de insulina (UI) |
| `insulin_type` | text | Tipo (Rápida, Basal) |
| `insulin_local` | text | Local de aplicação |
| `carbohydrates` | number | Carboidratos consumidos (g) |
| `food_description` | text | Descrição dos alimentos |
| `breastfeeding_type` | enum | Peito, Bomba, Ambos, Não realizou |
| `breastfeeding_duration` | number | Duração em minutos |
| `breast_side` | enum | Esquerdo, Direito, Ambos |
| `extracted_amount` | number | Quantidade extraída (ml) |
| `baby_mood` | enum | Humor do bebê |
| `baby_sleep` | text | Qualidade do sono |
| `symptoms` | text | Sintomas relatados |
| `notes` | text | Observações livres |

---

## Licença

Projeto privado. Todos os direitos reservados.

---

**Desenvolvido com 💜 para gestantes e lactantes.**
