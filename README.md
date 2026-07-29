# Eva — AI Communication Mentor

> Your personal AI mentor for spoken English, confidence, and interview skills.

Eva is a voice-first AI companion that helps you improve spoken English, communication skills, pronunciation, grammar, vocabulary, and interview performance through natural conversations.

---

## Features

| Feature | Description |
|---|---|
| 🎤 Voice Conversations | Voice-to-voice, continuous listening, natural responses |
| 🧠 English Tutoring | Grammar, vocabulary, pronunciation, fluency coaching |
| 💼 Interview Mode | Role-specific mock interviews with detailed reports |
| 📚 Daily Practice | 9 practice modes (storytelling, debate, office English, etc.) |
| 📊 Progress Dashboard | Charts, streaks, vocabulary growth, achievements |
| 🔐 Google OAuth | Secure sign-in, persistent progress |

---

## Tech Stack

**Frontend**  
React 18 · TypeScript · Vite · TailwindCSS · Three.js · React Three Fiber · Framer Motion · Zustand · Recharts

**Backend**  
FastAPI · Python 3.11+ · SQLAlchemy (async) · SQLite (dev) / PostgreSQL (prod)

**AI**  
OpenAI GPT-4o (conversation) · OpenAI TTS (speech synthesis) · OpenAI Whisper (transcription) · Web Speech API (browser-native fallback)

---

## Prerequisites

- **Node.js** 18+ and **npm** 9+
- **Python** 3.11+
- **Git**
- A Google Cloud project with OAuth 2.0 credentials
- An OpenAI API key

---

## Installation

### 1 — Clone and enter the project

```powershell
cd "C:\Users\jvenk\Desktop\Eva -AI"
```

### 2 — Frontend setup

```powershell
cd frontend
npm install
```

Copy the environment file and fill in your values:

```powershell
Copy-Item .env.example .env
```

Edit `frontend\.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### 3 — Backend setup

```powershell
cd ..\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copy the environment file:

```powershell
Copy-Item .env.example .env
```

Edit `backend\.env`:

```env
OPENAI_API_KEY=sk-your-openai-key-here
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
APP_SECRET_KEY=some-random-secret-32-chars-minimum
JWT_SECRET_KEY=another-random-secret-for-jwt
```

---

## Running the App

Open **two terminals** in VS Code.

**Terminal 1 — Backend:**

```powershell
cd "C:\Users\jvenk\Desktop\Eva -AI\backend"
.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**

```powershell
cd "C:\Users\jvenk\Desktop\Eva -AI\frontend"
npm run dev
```

Open your browser at **http://localhost:5173**

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized JavaScript origins:
   - `http://localhost:5173`
7. Authorized redirect URIs:
   - `http://localhost:5173`
8. Copy the **Client ID** into both `.env` files

---

## OpenAI Setup

1. Sign up / log in at [platform.openai.com](https://platform.openai.com/)
2. Go to **API Keys** and create a new key
3. Paste the key as `OPENAI_API_KEY` in `backend\.env`

> **Cost note:** The app uses GPT-4o for conversation, TTS for speech, and Whisper for transcription. A typical 30-minute session costs approximately $0.10–$0.30.

---

## Project Structure

```
Eva -AI/
├── frontend/                   # React + TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── eva/            # EvaCore (Three.js), AudioVisualizer
│   │   │   ├── layout/         # AppLayout, Sidebar, TopBar
│   │   │   ├── modals/         # SettingsModal
│   │   │   └── ui/             # Button, Card, Badge, Modal, Toast, ScoreCard
│   │   ├── hooks/
│   │   │   └── useVoice.ts     # Voice session orchestration hook
│   │   ├── lib/
│   │   │   ├── api.ts          # Axios client + all API calls
│   │   │   └── utils.ts        # Helpers
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── HomePage.tsx
│   │   │   ├── ConversationPage.tsx
│   │   │   ├── InterviewPage.tsx
│   │   │   ├── PracticePage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   └── HistoryPage.tsx
│   │   ├── services/
│   │   │   ├── voiceService.ts # Web Speech API + audio metering
│   │   │   └── ttsService.ts   # OpenAI TTS + Web Speech fallback
│   │   ├── stores/
│   │   │   ├── authStore.ts    # Zustand auth store (persisted)
│   │   │   ├── sessionStore.ts # Active session state
│   │   │   └── uiStore.ts      # UI state (toasts, modals, etc.)
│   │   └── types/
│   │       └── index.ts        # All TypeScript types
│   ├── .env.example
│   └── package.json
│
├── backend/                    # FastAPI + Python
│   ├── app/
│   │   ├── api/
│   │   │   ├── router.py
│   │   │   └── v1/
│   │   │       ├── auth.py     # Google OAuth, JWT refresh, user profile
│   │   │       ├── sessions.py # Session CRUD
│   │   │       ├── chat.py     # Chat messages, TTS, STT
│   │   │       ├── interview.py# Interview lifecycle + reports
│   │   │       └── progress.py # Analytics, achievements
│   │   ├── core/
│   │   │   ├── config.py       # Pydantic settings
│   │   │   ├── database.py     # Async SQLAlchemy engine
│   │   │   ├── dependencies.py # FastAPI DI (auth, db)
│   │   │   ├── logging.py      # Structured logging
│   │   │   └── security.py     # JWT, bcrypt
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   └── services/
│   │       ├── conversation_engine.py  # Eva's AI brain
│   │       ├── interview_engine.py     # Interview Q&A + reporting
│   │       ├── progress_service.py     # Stats aggregation
│   │       ├── google_auth.py          # Google token verification
│   │       └── openai_client.py        # OpenAI API wrapper
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
│
└── README.md
```

---

## Environment Variables Reference

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend URL (default: `http://localhost:8000`) |
| `VITE_GOOGLE_CLIENT_ID` | Yes | Google OAuth 2.0 Client ID |

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth Client ID |
| `APP_SECRET_KEY` | Yes | App secret (32+ random chars) |
| `JWT_SECRET_KEY` | Yes | JWT signing secret (32+ random chars) |
| `DATABASE_URL` | No | Database URL (defaults to SQLite) |
| `OPENAI_MODEL` | No | GPT model (default: `gpt-4o`) |
| `OPENAI_TTS_VOICE` | No | TTS voice (default: `nova`) |

---

## Using Eva Without API Keys

Eva is designed to work without API keys for initial exploration:

- **Without OpenAI key:** The conversation engine will fail gracefully. Eva will respond with a fallback message. TTS falls back to the browser's Web Speech API.
- **Without Google OAuth:** You cannot sign in. You can add a demo bypass (see below).

### Demo Mode (no Google OAuth)

To test without Google OAuth, temporarily add this endpoint to `backend/main.py`:

```python
@app.post("/api/auth/demo")
async def demo_login():
    # Returns a test token — NEVER use in production
    ...
```

---

## Switching to PostgreSQL

1. Install `asyncpg`: `pip install asyncpg`
2. Update `backend/.env`:
   ```env
   DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/eva_db
   ```
3. Create the database: `createdb eva_db`
4. Restart the backend — tables are created automatically on startup.

---

## Voice Recognition Notes

- Voice recognition uses the **Web Speech API** (browser-native). This requires **Chrome** or **Edge** for best results.
- Firefox has limited/no support for continuous speech recognition.
- Microphone permission must be granted when first prompted.
- The app falls back to text input automatically if voice is not available.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Could not reach Eva" | Check backend is running on port 8000 |
| Mic not working | Allow microphone in browser, use Chrome/Edge |
| Google login fails | Verify Client ID is set correctly in both `.env` files |
| TTS not speaking | Check `OPENAI_API_KEY` is valid; browser TTS activates as fallback |
| Database errors | Delete `backend/eva.db` to reset the SQLite database |
| `pip install` fails | Ensure Python 3.11+ and venv is activated |

---

## Available npm Scripts

```powershell
npm run dev        # Start development server
npm run build      # Production build
npm run preview    # Preview production build
npm run type-check # TypeScript type checking
npm run lint       # ESLint
```

---

## API Documentation

When the backend is running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Health check:** http://localhost:8000/health

---

## Production Deployment Notes

For production (not required for local MVP):

1. Set `APP_ENV=production` to disable Swagger docs
2. Use PostgreSQL instead of SQLite
3. Set strong random values for `APP_SECRET_KEY` and `JWT_SECRET_KEY`
4. Add your production domain to `ALLOWED_ORIGINS` and Google OAuth
5. Serve frontend via `npm run build` output through a CDN or static host
6. Run backend with `uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2`

---

*Built with Eva v1.0.0*
