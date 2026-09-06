# 🚂 Deploy Full Stack ke Railway

Panduan deploy **backend + frontend dalam 1 platform Railway** (tanpa Vercel).

> ✅ **Railpack v0.39.0 ready** - monorepo dengan 2 services otomatis terdeteksi.

---

## 📋 Arsitektur

```
┌─────────────────────────────────────────┐
│         RAILWAY PROJECT                 │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐   ┌──────────────┐  │
│  │   frontend   │   │   backend    │  │
│  │  (Next.js)   │◄──┤  (Node.js)   │  │
│  │  port 3000   │   │  port 3001   │  │
│  │  public URL  │   │  public URL  │  │
│  └──────────────┘   └──────┬───────┘  │
│                            │           │
│                     ┌──────▼───────┐   │
│                     │   Volume     │   │
│                     │   /data      │   │
│                     │  • sessions/ │   │
│                     │  • db.sqlite │   │
│                     └──────────────┘   │
└─────────────────────────────────────────┘
```

---

## 🏗️ Struktur Monorepo (Railpack-Compatible)

```
chatbot-assistant/
├── railway.toml          ← Root config: 2 services dengan rootDirectory
├── RAILWAY_DEPLOY.md
├── README.md
├── backend/
│   ├── railpack.toml     ← Optional: explicit config
│   ├── railway.json      ← Backup config
│   ├── package.json      ← punya "start": "node src/server.js"
│   └── src/
└── frontend/
    ├── railpack.toml     ← Optional: explicit config
    ├── railway.json      ← Backup config
    ├── package.json      ← punya "start": "node server.js"
    ├── next.config.js    ← output: 'standalone'
    ├── server.js         ← Custom server untuk standalone
    └── src/
```

> **⚠️ Penting**: JANGAN taruh `start.sh`, `Dockerfile`, atau `Procfile` di root. Railpack akan bingung. Config harus spesifik di subdirectory atau via `railway.toml` root.

---

## 🚀 Langkah Deploy

### 1️⃣ Persiapan Repo

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/chatbot-assistant.git
git push -u origin main
```

### 2️⃣ Buat Project di Railway

1. Buka https://railway.app → **New Project** → **Deploy from GitHub repo**
2. Pilih repository Anda
3. Railway akan **scan** `railway.toml` dan otomatis membuat 2 services:
   - `backend` (rootDirectory: `backend`)
   - `frontend` (rootDirectory: `frontend`)
4. Railpack akan deteksi Node.js di setiap subdirectory → auto-build

**Jika `railway.toml` tidak ter-detect:**

Cara manual:
1. Klik **+ New** → **GitHub Repo** → pilih repo
2. Klik service baru → **Settings** → **Root Directory** → set ke `backend`
3. Ulangi untuk frontend dengan rootDirectory `frontend`

### 3️⃣ Konfigurasi Backend Service

Di Railway dashboard, klik service **backend** → tab **Variables**:

```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
SYSTEM_PROMPT="Kamu adalah asisten AI yang ramah."
NODE_ENV=production
DATA_PATH=/data
SESSION_NAME=wa-session
# CORS_ORIGIN di-set setelah frontend dapat URL (lihat step 5)
```

### 4️⃣ Konfigurasi Frontend Service

Klik service **frontend** → tab **Variables**:

```env
NODE_ENV=production
# Backend URL (lihat step 5)
NEXT_PUBLIC_API_URL=https://backend-production-xxxx.up.railway.app
NEXT_PUBLIC_WS_URL=https://backend-production-xxxx.up.railway.app
```

### 5️⃣ Setup Volume untuk Persistence

**PENTING** — Tanpa Volume, session WA akan hilang tiap restart!

1. Klik service **backend** → tab **Settings** → scroll ke **Volumes**
2. Klik **+ New Volume**
3. Mount path: `/data`
4. Klik **Add**

Sekarang folder `/data` akan persistent across deploys.

### 6️⃣ Catat URL & Set CORS

1. Klik service **backend** → tab **Settings** → **Networking**
2. Klik **Generate Domain** → catat URL: `https://backend-xxx.up.railway.app`

3. Klik service **frontend** → tab **Settings** → **Networking**
4. Klik **Generate Domain** → catat URL: `https://frontend-xxx.up.railway.app`

5. Balik ke service **backend** → tab **Variables**:
   ```env
   CORS_ORIGIN=https://frontend-xxx.up.railway.app
   ```

6. Service **frontend** → tab **Variables**:
   ```env
   NEXT_PUBLIC_API_URL=https://backend-xxx.up.railway.app
   NEXT_PUBLIC_WS_URL=https://backend-xxx.up.railway.app
   ```

7. Kedua service akan auto-redeploy.

### 7️⃣ Scan QR WhatsApp

1. Buka URL frontend (misal `https://frontend-xxx.up.railway.app`)
2. Lihat panel **WhatsApp Gateway** di dashboard
3. QR code akan muncul di console log + panel
4. Buka WhatsApp di HP → **Linked Devices** → **Link a Device**
5. Scan QR → bot siap! 🎉

---

## 💰 Estimasi Biaya Railway

| Resource | Free Tier | Hobby Plan ($5/mo) |
|----------|-----------|---------------------|
| CPU | 500 jam/bulan | Unlimited |
| RAM | 512 MB | 8 GB |
| Volume | ❌ Tidak ada | ✅ Included |
| Custom domain | ✅ | ✅ |
| Sleep after inactivity | ✅ (free) | ❌ |

> ⚠️ **Free tier** tidak punya Volume. Session WA akan reset tiap restart (login ulang).
> Rekomendasi: minimal **Hobby Plan ($5/bulan)** untuk production use.

---

## 🔧 Troubleshooting Railway

### ⚠️ Error: "Railpack could not determine how to build the app" / "Script start.sh not found"

Penyebab: Railpack menganalisis root directory project, bukan subdirectory service. Fix:

1. **Pastikan `railway.toml` ada di root** dengan `rootDirectory` di setiap service:
   ```toml
   [[services]]
   name = "backend"
   rootDirectory = "backend"
   ```

2. **Hapus `start.sh`, `Procfile`, `Dockerfile`** dari root project (kalau ada).

3. **Pastikan setiap subdirectory punya `package.json`** dengan script `start` yang valid:
   - `backend/package.json` → `"start": "node src/server.js"`
   - `frontend/package.json` → `"start": "node server.js"`

4. **Optional**: Taruh `railpack.toml` di setiap subdirectory sebagai fallback:
   ```toml
   [build]
   provider = "node@20"

   [start]
   cmd = "node src/server.js"
   ```

5. **Manual override** via Railway dashboard:
   - Klik service → **Settings** → **Root Directory** → `backend` (atau `frontend`)
   - **Build Command** (jika perlu): `npm ci`
   - **Start Command**: `node src/server.js`

### Service "Deploy Failed"
- Cek tab **Logs** di Railway dashboard
- Pastikan `package.json` ada di root folder service
- Backend: cek `railway.json` di `backend/`

### QR Code tidak muncul di dashboard
- Tunggu 10-20 detik setelah deploy pertama (WA butuh waktu inisialisasi)
- Cek log backend di Railway → cari error
- Klik tombol **Reconnect** di dashboard

### CORS error di browser console
- Pastikan `CORS_ORIGIN` di backend match dengan URL frontend Railway
- Format: `https://xxx.up.railway.app` (tanpa trailing slash)

### Build Frontend Gagal (Next.js)
- Pastikan `next.config.js` ada `output: 'standalone'`
- Cek log build → error biasanya tentang missing static files atau dependencies
- Solusi: build script di package.json sudah include `cp -r .next/static .next/standalone/.next/`

### Session Hilang Setelah Restart
- Pastikan Volume sudah ter-mount di `/data`
- Cek `DATA_PATH=/data` ada di Variables backend</new_str>

---

## 🌐 Custom Domain (Optional)

1. Railway dashboard → service **frontend** → **Settings** → **Domains**
2. Klik **Custom Domain** → masukkan domain Anda (misal `bot.yourdomain.com`)
3. Tambahkan CNAME record di DNS:
   ```
   CNAME bot.yourdomain.com → xxx.up.railway.app
   ```
4. Ulangi untuk backend jika perlu (misal `api.yourdomain.com`)

Update `CORS_ORIGIN` dan `NEXT_PUBLIC_API_URL` ke domain baru.

---

## 🔄 Update Deployment

Setiap `git push` ke branch yang di-watch akan otomatis trigger redeploy:

```bash
git add .
git commit -m "Update feature X"
git push
```

Railway akan rebuild + redeploy service yang berubah.

---

## 🔍 Cara Kerja Railpack v0.39.0

Railpack adalah build system baru Railway (menggantikan Nixpacks). Cara kerjanya:

1. **Deteksi bahasa** otomatis dari file di rootDirectory
   - Melihat `package.json` → deteksi Node.js
   - Melihat `requirements.txt` → deteksi Python
   - Dst.

2. **Auto-install dependencies**
   - Node.js: `npm ci` atau `npm install`

3. **Cari start command**
   - Dari `package.json` script `"start"`
   - Fallback ke `railpack.toml` `[start] cmd`
   - Fallback ke `Procfile` `web:`
   - Fallback ke `Dockerfile` `CMD`

4. **Build & Run**
   - Untuk Next.js dengan `output: 'standalone'`: build artifacts di `.next/standalone/`
   - Custom `server.js` handle mounting static files + start built server

### Kapan Perlu `railpack.toml` Explicit?

- Kalau Railpack salah deteksi bahasa
- Kalau mau override `start command`
- Kalau butuh custom env saat build

Untuk project ini, Railpack harusnya auto-detect karena:
- ✅ `package.json` ada di setiap subdir
- ✅ Script `"start"` terdefinisi
- ✅ Node.js dependencies jelas
- ✅ `rootDirectory` di `railway.toml` mengarahkan Railpack ke subdir yang benar</new_str>
