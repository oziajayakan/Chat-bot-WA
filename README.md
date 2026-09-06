# 🤖 Chatbot Assistant - Realtime AI + WhatsApp

Chatbot AI **realtime** yang menggunakan **OpenRouter** (multi-model LLM) dan terintegrasi dengan **WhatsApp** via QR code scan. Dilengkapi **dashboard web advanced** dengan **console log realtime**, statistik, dan chat tester.

![Stack](https://img.shields.io/badge/Backend-Node.js_20-green)
![Stack](https://img.shields.io/badge/Frontend-Next.js_14-black)
![Stack](https://img.shields.io/badge/LLM-OpenRouter-blue)
![Stack](https://img.shields.io/badge/WhatsApp-Baileys-green)

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 🧠 **Multi-Model AI** | OpenRouter - Claude, GPT-4o, Gemini, Llama, Mistral, Qwen, dll |
| 💬 **WhatsApp Gateway** | Scan QR → bot auto-reply semua chat masuk |
| 🎨 **Dashboard Advanced** | Dark UI modern, glassmorphism, animasi smooth |
| 📊 **Statistik Realtime** | Total messages, users, tokens terpakai |
| 📡 **Console Log** | Live monitoring logs dengan filter & auto-scroll |
| 🧪 **Chat Tester** | Test model AI langsung dari dashboard |
| 🔄 **Streaming Response** | Response token-by-token (SSE via Socket.IO) |
| 💾 **Chat History** | Persistent via SQLite/Postgres |
| 🚀 **Deploy Ready** | Railway (backend) + Vercel (frontend) |

---

## 📁 Struktur Project

```
chatbot-assistant/
├── backend/                    # Node.js + Express + Socket.IO
│   ├── src/
│   │   ├── server.js          # Entry point
│   │   ├── routes/api.js      # REST endpoints
│   │   ├── sockets/index.js   # Socket.IO handlers
│   │   ├── services/
│   │   │   ├── openrouter.js  # LLM client
│   │   │   ├── whatsapp.js    # Baileys integration
│   │   │   └── logger.js      # Custom logger w/ events
│   │   └── database/db.js     # SQLite repositories
│   ├── sessions/              # WhatsApp auth (gitignored)
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                   # Next.js 14 + Tailwind + shadcn
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx       # Main dashboard
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/            # shadcn components
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── ConsoleLog.tsx
│   │   │   ├── WhatsAppPanel.tsx
│   │   │   ├── WaActivity.tsx
│   │   │   └── StatsCards.tsx
│   │   └── lib/
│   │       ├── socket.ts
│   │       ├── api.ts
│   │       └── utils.ts
│   ├── vercel.json
│   └── package.json
│
├── docker-compose.yml          # Full stack in 1 command
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prasyarat
- Node.js 18+
- Akun [OpenRouter](https://openrouter.ai) (untuk API key)
- WhatsApp (untuk scan QR)

### 1️⃣ Clone & Setup

```bash
git clone <repo-url> chatbot-assistant
cd chatbot-assistant

# Install backend
cd backend
cp .env.example .env
# Edit .env → isi OPENROUTER_API_KEY
npm install

# Install frontend (terminal baru)
cd ../frontend
cp .env.example .env.local
npm install
```

### 2️⃣ Jalankan Backend

```bash
cd backend
npm run dev
# → Server jalan di http://localhost:3001
# → WhatsApp QR Code otomatis muncul di log + dashboard
```

### 3️⃣ Jalankan Frontend

```bash
cd frontend
npm run dev
# → Dashboard jalan di http://localhost:3000
```

### 4️⃣ Scan QR WhatsApp

Buka `http://localhost:3000`, lihat panel **WhatsApp Gateway**, klik QR → scan dari HP Anda.

**Done!** Sekarang chatbot siap menerima pesan dari WhatsApp.

---

## 🐳 Docker (1-Command Deploy)

```bash
# Setelah setup .env
docker-compose up --build
```

Akses:
- Dashboard: `http://localhost:3000`
- API: `http://localhost:3001`

---

## ☁️ Deploy ke Production

### � Opsi 1: Full Stack di Railway (RECOMMENDED)

Deploy **backend + frontend** dalam 1 project Railway. Lebih simpel, single domain management.

📖 **[Lihat panduan lengkap: RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)**

Quick steps:
1. Push repo ke GitHub
2. Railway → **New Project** → Deploy repo
3. Railway otomatis detect `railway.toml` → 2 services (backend + frontend)
4. Add **Volume** ke backend service (mount `/data`) untuk persist session WA
5. Set env vars (lihat RAILWAY_DEPLOY.md)
6. Done! ✅

### 🔵 Opsi 2: Backend Railway + Frontend Vercel

1. Push project ke GitHub
2. Buka [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Pilih folder `backend/`
4. Set environment variables di dashboard Railway:
   ```
   OPENROUTER_API_KEY=sk-or-v1-...
   OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
   CORS_ORIGIN=https://your-dashboard.vercel.app
   PORT=3001
   DATA_PATH=/data
   ```
5. **PENTING** — Railway gratis punya **ephemeral storage**. Session WhatsApp akan reset tiap restart!
   - Solusi: Gunakan **Railway Volume** atau upgrade ke plan berbayar
   - Alternatif: Deploy ke VPS (DigitalOcean, Hetzner, dll) dengan `docker-compose`
6. Catat URL Railway, misal: `https://chatbot-backend.up.railway.app`

### 🟦 Frontend → Vercel (Opsi 2)

1. Buka [vercel.com](https://vercel.com) → **Add New Project** → Import repo
2. **Root Directory**: `frontend`
3. Set environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://chatbot-backend.up.railway.app
   NEXT_PUBLIC_WS_URL=https://chatbot-backend.up.railway.app
   ```
4. Deploy 🚀

---

## 🔑 Konfigurasi Environment

### Backend `.env`

| Variable | Default | Keterangan |
|----------|---------|------------|
| `PORT` | `3001` | Port server |
| `OPENROUTER_API_KEY` | - | **Wajib** - API key dari openrouter.ai |
| `OPENROUTER_DEFAULT_MODEL` | `anthropic/claude-3.5-sonnet` | Model default |
| `SYSTEM_PROMPT` | Default assistant | System prompt untuk AI |
| `CORS_ORIGIN` | `*` | Whitelist origin (pisah koma) |
| `DATABASE_PATH` | `./database.sqlite` | Lokasi SQLite |
| `SESSION_PATH` | `./sessions` | Folder session WA |
| `LOG_LEVEL` | `info` | `debug`/`info`/`warn`/`error` |

### Model yang Didukung

Edit di `backend/src/services/openrouter.js`:

```js
this.availableModels = [
  { id: 'anthropic/claude-3.5-sonnet', ... },
  { id: 'openai/gpt-4o', ... },
  { id: 'google/gemini-pro-1.5', ... },
  { id: 'meta-llama/llama-3.1-70b-instruct', ... },
  // Tambah model lain dari https://openrouter.ai/models
];
```

---

## 📡 API Endpoints

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/health` | Health check |
| GET | `/api/models` | Daftar model LLM |
| POST | `/api/chat` | Chat (non-stream) |
| GET | `/api/stats` | Statistik |
| GET | `/api/sessions` | Daftar session user |
| GET | `/api/history/:userId` | History chat user |
| GET | `/api/whatsapp/status` | Status WA |
| POST | `/api/whatsapp/reconnect` | Reconnect WA |
| POST | `/api/whatsapp/logout` | Logout WA |
| POST | `/api/whatsapp/send` | Kirim pesan WA |
| GET | `/api/logs` | Ambil logs |

### Socket.IO Events

**Client → Server:**
- `chat:send` - Kirim pesan (streaming response)
- `chat:history` - Minta history

**Server → Client:**
- `chat:start` / `chat:delta` / `chat:done` / `chat:error`
- `wa:qr` / `wa:status` / `wa:connected` / `wa:message`
- `log:new` - Realtime log entry
- `stats:initial` - Stats saat connect

---

## 🛠️ Customisasi

### Mengubah System Prompt
Edit `backend/.env`:
```
SYSTEM_PROMPT="Kamu adalah customer service Toko XYZ..."
```

### Multi-Bot / Multi-Session
Ubah `SESSION_NAME` per instance jika ingin jalankan beberapa bot sekaligus.

### Integrasi dengan Tools / Function Calling
Extend `backend/src/services/openrouter.js` untuk handle `tools` parameter OpenRouter.

---

## 🐛 Troubleshooting

### QR Code tidak muncul
- Pastikan port 3001 accessible
- Cek log backend untuk error
- Coba klik **Reconnect** di dashboard

### Session hilang setelah restart
- **Railway free tier**: storage ephemeral, gunakan Volume atau VPS
- **Vercel**: tidak bisa deploy backend (serverless), gunakan Railway/Render/Fly.io

### OpenRouter error 401
- API key salah atau expired
- Cek quota di [openrouter.ai/keys](https://openrouter.ai/keys)

### CORS error
- Set `CORS_ORIGIN` di backend `.env` dengan URL frontend yang valid
- Format: `https://your-app.vercel.app` (tanpa trailing slash)

### WhatsApp ter-logout otomatis
- Jangan logout manual dari HP
- Untuk multiple devices, pakai fitur **Linked Devices** resmi WA

---

## 📜 License

MIT - bebas digunakan untuk komersil/non-komersil.

---

## 🙏 Credits

- [OpenRouter](https://openrouter.ai) - Multi-model LLM API
- [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Next.js](https://nextjs.org) - React framework
