# 🎙️ Eva — AI Communication Mentor

> **Speak Better. Communicate Better. Interview Better.**

Eva is a voice-first AI companion that helps users improve spoken English, communication skills, pronunciation, grammar, vocabulary, and interview performance through natural conversations powered by AI.

---

# 🚀 Demo

> 🚧 **Currently under active development**

### MVP Features

- 🎤 Voice-to-Voice Conversations
- 🧠 AI English Tutor
- 💼 Mock Interviews
- 📊 Progress Dashboard
- 📚 Daily Practice Sessions
- 🔐 Secure Authentication

📹 Demo video and screenshots will be added after the first stable release.

---

# 📸 Screenshots

<img width="1907" height="932" alt="image" src="https://github.com/user-attachments/assets/f81c0051-fef1-4112-a442-8c7fb8e34545" />


The repository will include screenshots for:

- Home Screen
- Voice Conversation
- Interview Mode
- Dashboard
- Progress Analytics
- Mobile Responsive UI

---

# ✨ Features

| Feature | Description |
|----------|-------------|
| 🎤 Voice Conversations | Voice-to-voice conversations with continuous listening and natural AI responses |
| 🧠 English Tutoring | Grammar correction, pronunciation, vocabulary expansion, fluency coaching |
| 💼 Interview Mode | Role-specific mock interviews with AI-generated reports |
| 📚 Daily Practice | Storytelling, debate, office English, casual conversations and more |
| 📊 Progress Dashboard | Speaking analytics, vocabulary growth, streaks and achievements |
| 🔐 Google OAuth | Secure authentication with persistent user progress |

---

# 🛠 Tech Stack

## Frontend

- React 18
- TypeScript
- Vite
- TailwindCSS
- Three.js
- React Three Fiber
- Framer Motion
- Zustand
- React Query
- Recharts

---

## Backend

- FastAPI
- Python 3.11+
- SQLAlchemy (Async)
- SQLite (Development)
- PostgreSQL (Production)

---

## AI Stack

- OpenAI API *(Model Configurable)*
    - GPT-4o
    - GPT-4.1
    - Future-ready for GPT-5
- OpenAI Whisper
- OpenAI Text-to-Speech
- Web Speech API (Browser Fallback)

---

# 📋 Prerequisites

- Node.js 18+
- npm 9+
- Python 3.11+
- Git
- Google OAuth Credentials
- OpenAI API Key

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/eva-ai.git
cd eva-ai
```

---

## Frontend

```bash
cd frontend

npm install

Copy-Item .env.example .env
```

Update:

```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_client_id
```

---

## Backend

```bash
cd ../backend

python -m venv .venv

.venv\Scripts\activate

pip install -r requirements.txt

Copy-Item .env.example .env
```

Update

```env
OPENAI_API_KEY=your_key

GOOGLE_CLIENT_ID=your_client_id

APP_SECRET_KEY=your_secret

JWT_SECRET_KEY=your_secret
```

---

# ▶ Running Eva

## Backend

```bash
cd backend

.venv\Scripts\activate

uvicorn main:app --reload --port 8000
```

---

## Frontend

```bash
cd frontend

npm run dev
```

Open

```
http://localhost:5173
```

---

# 🔑 Google OAuth Setup

1. Create a project in Google Cloud Console
2. Enable OAuth Credentials
3. Add

```
http://localhost:5173
```

as Authorized JavaScript Origin.

Copy the generated Client ID into both `.env` files.

---

# 🤖 OpenAI Setup

Create an API Key from OpenAI Platform.

Add

```env
OPENAI_API_KEY=your_key
```

to

```
backend/.env
```

---

# 📁 Project Structure

```
Eva-AI/

├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   ├── api/
│   ├── core/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── alembic/
│   ├── main.py
│   └── requirements.txt
│
└── README.md
```

---

# 🌟 Roadmap

## Completed ✅

- Voice-first architecture
- AI conversation engine
- Grammar correction
- Interview module
- Progress dashboard
- Google Authentication

---

## Coming Soon 🚀

- Pronunciation scoring
- Emotion-aware AI conversations
- Resume-based interview generation
- IELTS & TOEFL practice
- AI memory
- Personalized learning paths
- Mobile application
- Offline speech model
- Multiple AI personalities

---

# 🧩 Voice Recognition

Eva uses:

- Web Speech API
- OpenAI Whisper

For best experience use:

- ✅ Chrome
- ✅ Microsoft Edge

Firefox has limited support.

---

# 🛠 Troubleshooting

| Problem | Solution |
|----------|----------|
| Backend not reachable | Verify FastAPI is running on port 8000 |
| Microphone unavailable | Grant browser microphone permission |
| Google Login fails | Verify OAuth Client ID |
| Voice not playing | Check OpenAI API Key or browser TTS |
| Database issues | Delete `backend/eva.db` and restart |
| pip install errors | Use Python 3.11 virtual environment |

---

# 📜 Available Scripts

```bash
npm run dev

npm run build

npm run preview

npm run lint

npm run type-check
```

---

# 📖 API Documentation

Once the backend is running:

Swagger

```
http://localhost:8000/docs
```

ReDoc

```
http://localhost:8000/redoc
```

Health Check

```
http://localhost:8000/health
```

---

# 🚀 Production Deployment

For production deployment:

- PostgreSQL
- Strong JWT secrets
- HTTPS
- Production Google OAuth
- Docker (optional)
- CI/CD Pipeline

---

# 👨‍💻 Author

**Sandeep Venkata**

B.Tech Computer Science (Data Science)

GitHub: https://github.com/YOUR_USERNAME

---

# 📄 License

This project is licensed under the MIT License.

---

⭐ **If you found this project interesting, consider giving it a star!**
