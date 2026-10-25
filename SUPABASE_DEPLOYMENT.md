# FIELDSHIFT 2026 — SUPABASE POSTGRESQL & FREE CLOUD DEPLOYMENT GUIDE

This guide provides step-by-step instructions for deploying the **FieldShift 2026** application to production using **Supabase PostgreSQL** for the database, **Render / Railway / Koyeb** for the FastAPI backend, and **Vercel / Netlify** for the React/Vite frontend—completely within free-tier limits.

---

## 1. Supabase PostgreSQL Architecture

FieldShift 2026 uses **PostgreSQL 17** hosted on Supabase.

### Connection URLs Supported

Supabase provides three connection methods:

1. **Session Pooler (Port 5432) — RECOMMENDED FOR BACKEND & MIGRATIONS:**
   - **Host:** `aws-0-[region].pooler.supabase.com`
   - **Port:** `5432`
   - **Format:** `postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres`
   - **Features:** IPv4 compatible, supports schema DDL migrations, prepared statements, and persistent backend connections.

2. **Transaction Pooler (Port 6543) — RECOMMENDED FOR HIGH-CONCURRENCY SERVERLESS:**
   - **Host:** `aws-0-[region].pooler.supabase.com`
   - **Port:** `6543`
   - **Format:** `postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`
   - **Features:** PgBouncer transaction pooling. The FieldShift backend automatically adapts this connection with `prepare_threshold=None` to ensure compatibility.

3. **Direct Database Connection (Port 5432):**
   - **Host:** `db.[project-ref].supabase.co`
   - **Port:** `5432`
   - **Format:** `postgresql://postgres:[PASSWORD]@db.[project-ref].supabase.co:5432/postgres`
   - **Note:** Requires an IPv6-capable network or direct cloud routing.

---

## 2. Running Migrations

Database schema migrations are versioned, idempotent, and located in `backend/alembic/versions/`:

- `0001_initial.sql`: Core tables (`users`, `farms`, `sessions`, `fields`, `field_history`, `analyses`)
- `0002_add_soil_ph.sql`: Persistent soil pH chemistry column on `fields`
- `0003_add_farm_outcomes.sql`: Empirical harvest outcomes and variance tracking table (`farm_outcomes`)
- `0004_add_auxiliary_tables.sql`: Auxiliary research tracking tables (`weather_snapshots`, `ml_results`, `rotation_plans`, `adaptive_actions`, `validation_results`, `provenance_records`)

### How to Apply Migrations

Run from PowerShell or terminal:

```bash
# On Linux / macOS:
export DATABASE_URL="postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres"
python backend/run_migrations.py

# On Windows PowerShell:
$env:DATABASE_URL = "postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres"
python backend/run_migrations.py
```

The migration runner:
- Creates a `schema_migrations` tracking table.
- Executes only unapplied SQL migrations in chronological order.
- Can be safely run on every deployment without resetting or destroying existing records.

---

## 3. Importing Existing SQLite Data to Supabase

To transfer existing user accounts, farms, parcels, analyses, and harvest outcomes from `data/fieldshift.db` to Supabase without deleting the local database:

```bash
# PowerShell:
$env:DATABASE_URL = "postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres"
python backend/migrate_sqlite_to_pg.py
```

Features:
- Reads SQLite in read-only mode (`?mode=ro`).
- Uses `ON CONFLICT (id) DO UPDATE` to prevent duplicate primary keys.
- Automatically provisions archived parcel stubs for any historical orphaned test records to preserve foreign-key referential integrity.
- Updates PostgreSQL sequence generators (`setval`).
- Outputs verification row counts for both SQLite and PostgreSQL.

---

## 4. Backend Deployment (Render / Railway / Koyeb)

### Deploying on Render (Free Web Service)

1. Sign in to [Render Dashboard](https://dashboard.render.com/) (Free).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository: `danial-hossain/FieldShift2026`.
4. Configure Settings:
   - **Name:** `fieldshift-backend`
   - **Region:** Singapore / Oregon / Frankfurt
   - **Branch:** `master`
   - **Runtime:** `Python 3` (or `Docker` using the included `Dockerfile`)
   - **Build Command:**
     ```bash
     pip install -r requirements.txt -r backend/requirements.txt
     ```
   - **Start Command:**
     ```bash
     python backend/run_migrations.py && uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
     ```
5. Add Environment Variables (in Render Settings -> **Environment**):
   - `DATABASE_URL`: `postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres`
   - `CORS_ORIGINS`: `https://your-frontend.vercel.app,http://localhost:5173`
   - `GEMINI_API_KEY`: *(Your Google AI Gemini API Key)*
6. Click **Deploy Web Service**.
7. Once deployed, copy your backend URL (e.g., `https://fieldshift-backend.onrender.com`).

---

## 5. Frontend Deployment (Vercel / Netlify)

### Deploying on Vercel (Free)

1. Sign in to [Vercel](https://vercel.com/) with GitHub.
2. Click **Add New...** -> **Project**.
3. Select `danial-hossain/FieldShift2026`.
4. Configure Project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Configure Environment Variables in Vercel:
   - `VITE_API_URL`: `https://fieldshift-backend.onrender.com` (Your Render backend URL without trailing slash)
   - `VITE_GEMINI_API_KEY`: *(Optional fallback client key)*
6. Click **Deploy**.
7. Vercel automatically applies `frontend/vercel.json` SPA rewrites so direct navigation and refreshes work smoothly.

---

## 6. End-to-End Production Verification

Once both frontend and backend are deployed, verify the system:

1. **Health Check:**
   Open `https://your-backend.onrender.com/api/health` in your browser. Expected response:
   ```json
   {
     "status": "ok",
     "database": {
       "status": "ok",
       "dialect": "postgresql",
       "is_postgres": true
     }
   }
   ```
2. **User Authentication:**
   Open the frontend at `https://your-frontend.vercel.app` and sign in with researcher credentials.
3. **Parcel Creation:**
   Register a new test parcel in the Parcel Manager (e.g., Bogura coordinates `24.8465, 89.3777`).
4. **Optimization Pipeline:**
   Run PuLP CBC crop optimization; verify 6-season rotation and 3D visual outputs.
5. **Harvest Outcome Recording:**
   Log a seasonal harvest outcome in the Harvest Tracker; verify variance metrics and reload the page to confirm persistence in Supabase.
6. **Adaptive Replanning:**
   Execute adaptive replanning using the logged harvest outcome; verify the 5 remaining seasons are re-calculated with conservation thresholds.

---

## 7. Free-Tier Limitations & Recommendations

| Service | Free Tier Limits | Inactivity / Sleep Behavior | Recommendations |
| :--- | :--- | :--- | :--- |
| **Supabase** | 500 MB database, 2 active projects, 50k monthly active users | Project is automatically paused after 7 days of inactivity. | Set up a monthly uptime ping or sign in to Supabase dashboard once a week to prevent pausing. |
| **Render** | 750 free instance hours per month | Web service spins down after 15 minutes of inactivity. First request takes ~50s (cold start). | Free frontend ping or cron can keep it awake if desired. |
| **Vercel** | 100 GB bandwidth / month, unlimited deployments | Always instant (Edge CDN). | No cold starts. |

### Backup Recommendations

1. **Supabase Daily Backups:**
   Supabase provides automatic daily backups on the free tier accessible via the Database -> Backups tab.
2. **Local PostgreSQL Export (`pg_dump`):**
   ```bash
   pg_dump "postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres" > backup_$(date +%Y%m%d).sql
   ```

---

## 8. বাংলা সারসংক্ষেপ ও পরবর্তী পদক্ষেপ (Bangla Next Steps)

১. **ডাটাবেজ মাইগ্রেশন সম্পন্ন হয়েছে:**
   আপনার Supabase ডাটাবেজে (`thopipmyqyvulxfrgiin`) সফলভাবে সব টেবিল (`users`, `farms`, `fields`, `analyses`, `farm_outcomes`, `adaptive_actions`, ইত্যাদি) তৈরি হয়েছে এবং লোকাল SQLite ডাটাবেজের সমস্ত ৩১৩ জন ব্যবহারকারী, ১৮৮টি ফার্ম, ২২৩টি জমি এবং ৫০টি হার্ভেস্ট রেকর্ড হুবহু কোনো ডাটা ক্ষতি ছাড়াই Supabase PostgreSQL-এ মাইগ্রেট করা হয়েছে।

২. **ব্যাকএন্ড ডিপ্লয়মেন্ট (Render / Railway):**
   - [Render.com](https://render.com)-এ একটি নতুন Web Service তৈরি করুন এবং আপনার GitHub রিপোজিটরি সিলেক্ট করুন।
   - Environment Variables-এ `DATABASE_URL` সেট করুন (Session Pooler URL `aws-0-ap-northeast-1.pooler.supabase.com:5432`)।
   - `CORS_ORIGINS`-এ আপনার Vercel ফ্রন্টএন্ড URL যোগ করুন।

৩. **ফ্রন্টএন্ড ডিপ্লয়মেন্ট (Vercel):**
   - [Vercel.com](https://vercel.com)-এ রিপোজিটরিটি ইম্পোর্ট করুন।
   - Root Directory দিন `frontend`।
   - Environment Variable-এ `VITE_API_URL` হিসেবে আপনার Render ব্যাকএন্ড URL দিন (যেমন: `https://fieldshift-backend.onrender.com`)।
   - Deploy বাটনে ক্লিক করুন।
