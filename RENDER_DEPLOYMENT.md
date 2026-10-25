# FieldShift 2026 — Render Cloud Deployment Guide

This guide details the complete deployment process for **FieldShift 2026** on **Render** (Free Tier), running the React/Vite frontend as a Static Site and the Python/FastAPI backend as a Web Service, backed by **Supabase PostgreSQL** as the persistent database.

---

## 1. Architecture Overview

```
                      +---------------------------------------+
                      |       Web Browser (User / Farmer)    |
                      +-------------------+-------------------+
                                          |
                      +-------------------+-------------------+
                      |                                       |
                      v                                       v
        +----------------------------+         +----------------------------+
        |   fieldshift-frontend      |         |    fieldshift-backend      |
        |   Render Static Site       |  HTTP   |    Render Web Service      |
        |   React 19 + Three.js v186 | ------> |    FastAPI + PuLP MILP     |
        |   Global CDN (No Cold Start) | (CORS)  |    Port $PORT (Auto Spin)  |
        +----------------------------+         +--------------+-------------+
                                                              |
                                                              | Session Pooler
                                                              | (Port 5432)
                                                              v
                                               +----------------------------+
                                               |   Supabase PostgreSQL      |
                                               |   Project: thopipmyqyvulx  |
                                               |   14 Relational Tables     |
                                               +----------------------------+
```

| Component | Render Service Type | Root Directory | Build Command | Start / Publish Path |
| :--- | :--- | :--- | :--- | :--- |
| **Backend** | Web Service (Python 3.13) | `.` (Repo Root) | `pip install -r requirements.txt -r backend/requirements.txt` | `python backend/run_migrations.py && uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT` |
| **Frontend** | Static Site (`runtime: static`) | `frontend` | `npm install && npm run build` | `dist` (Rewrite `/*` &rarr; `/index.html`) |

---

## 2. Method 1: Deploy with Render Blueprint (Recommended)

Render Blueprints parse the included `render.yaml` file to deploy and link both services automatically.

### Steps:
1. Push your repository to GitHub:
   ```bash
   git push origin master
   ```
2. Log in to the [Render Dashboard](https://dashboard.render.com).
3. Click **New +** &rarr; Select **Blueprint**.
4. Connect your GitHub repository: `danial-hossain/FieldShift2026`.
5. Render detects `render.yaml` and lists the two services:
   - `fieldshift-backend` (Web Service)
   - `fieldshift-frontend` (Static Site)
6. Under **Environment Variables**, provide your secret credentials:
   - `DATABASE_URL`: Your Supabase connection string:
     ```
     postgresql://postgres.thopipmyqyvulxfrgiin:[YOUR-SUPABASE-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
     ```
   - `GEMINI_API_KEY`: *(Optional)* Your Google AI Gemini key for voice/research assistants.
7. Click **Apply**. Render will build and deploy both services automatically!

---

## 3. Method 2: Manual Dashboard Configuration

If you prefer to configure the services individually in the Render Dashboard:

### Step A: Deploy Backend Web Service
1. Click **New +** &rarr; **Web Service**.
2. Select your repository `danial-hossain/FieldShift2026`.
3. Configure the settings:
   - **Name**: `fieldshift-backend`
   - **Region**: `Oregon (US West)` (or closest to your users)
   - **Branch**: `master`
   - **Root Directory**: *(Leave blank for root)*
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install -r requirements.txt -r backend/requirements.txt
     ```
   - **Start Command**:
     ```bash
     python backend/run_migrations.py && uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: `Free`
4. Expand **Advanced**:
   - **Health Check Path**: `/api/health`
5. Under **Environment Variables**, add:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `PYTHON_VERSION` | `3.13.1` | Ensures Python 3.13 parity |
   | `ENVIRONMENT` | `production` | Activates secure cross-origin cookies |
   | `DATABASE_URL` | `postgresql://postgres.thopipmyqyvulxfrgiin:[PASS]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres` | Supabase Session Pooler |
   | `CORS_ORIGINS` | `https://fieldshift-frontend.onrender.com,http://localhost:5173` | Your frontend Render domain |
   | `CORS_ORIGIN_REGEX` | `^https:\/\/.*\.onrender\.com$` | Permits all Render preview/production origins |
   | `GEMINI_API_KEY` | `[YOUR_GEMINI_KEY]` | For Voice & AI Assistant |
   | `DB_POOL_SIZE` | `5` | Matches free-tier connection limits |
   | `DB_MAX_OVERFLOW` | `10` | Allows burst capacity |
6. Click **Create Web Service**. Wait for the build to complete and note your backend URL (e.g., `https://fieldshift-backend.onrender.com`).

---

### Step B: Deploy Frontend Static Site
1. Click **New +** &rarr; **Static Site**.
2. Select repository `danial-hossain/FieldShift2026`.
3. Configure the settings:
   - **Name**: `fieldshift-frontend`
   - **Branch**: `master`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Under **Redirects/Rewrites**:
   - **Type**: `Rewrite`
   - **Source Path**: `/*`
   - **Destination**: `/index.html`
5. Under **Environment Variables**:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://fieldshift-backend.onrender.com` *(Replace with your real backend URL)* |
6. Click **Create Static Site**.
7. Vite compiles all 70 modules into `dist/` in ~300ms. Once deployed, open your frontend URL!

---

## 4. Free Tier Limits & Cold Starts

### Backend Cold Starts (Render Free Web Service)
- **Sleep after Inactivity**: Render free web services automatically spin down to 0 instances after **15 minutes** of no incoming traffic.
- **Spin-up Time**: When the first user opens the app or calls an API endpoint after dormancy, Render spins the container back up. This cold start takes approximately **45 to 55 seconds**.
- **User Experience**: The frontend displays friendly loading indicators while the backend wakes up. Subsequent requests respond instantly in **<100 ms**.
- **Tip**: You can use a free uptime pinger (e.g., Cron-job.org or UptimeRobot) pinging `https://fieldshift-backend.onrender.com/api/health` every 10 minutes if you wish to keep it warm during demo presentations.

### Frontend Performance (Render Static Site)
- Render Static Sites are distributed across Render's global Content Delivery Network (CDN).
- They **never spin down** and have **zero cold starts**. Pages and 3D assets load instantaneously.

### Database Limits (Supabase Free PostgreSQL)
- **Active Connection Limits**: Free tier includes 60 direct pooler connections. The backend engine is configured with `pool_size=5` and `max_overflow=10`, safely within Supabase quotas.
- **Inactivity Pause**: Supabase free projects pause if no queries run for **7 consecutive days**. Pinging the backend or logging in unpauses/prevents pausing.

---

## 5. Verification Checklist

- [x] Frontend tests passing: `npm test` (83/83 passed in 138ms).
- [x] Frontend production bundle built: `npm run build` (compiled clean in 259ms).
- [x] Backend database migrations: `backend/run_migrations.py` applied 4 idempotent SQL migrations to Supabase.
- [x] Supabase PostgreSQL Integration test: `test_supabase_postgres_integration.py` (8/8 passed against live Supabase DB).
- [x] End-to-End Random Field test: `test_random_field_e2e.py` (5/5 passed over HTTP against FastAPI + Supabase).
- [x] CORS regex permits `https://*.onrender.com`.
- [x] Cross-origin cookie helper sets `SameSite=None` and `Secure=True` in production.
- [x] Health check endpoints: `/api/health` and `/healthz` return 200 OK.
- [x] `render.yaml` Blueprint created and validated.

---

## 6. সহজ বাংলায় দিকনির্দেশনা (Bangla Summary)

### ১. রেন্ডার (Render) এবং সুপাবেস (Supabase) ডিপ্লয়মেন্ট প্রক্রিয়া:
- আপনার পুরো প্রজেক্টটি বিনামূল্যে (Free Tier) ডিপ্লয় করার জন্য তৈরি করা হয়েছে।
- **ব্যাকএন্ড (FastAPI):** রেন্ডারের **Web Service** হিসেবে চলবে। ডাটাবেজ হিসেবে এটি সরাসরি আপনার সুপাবেস PostgreSQL ক্লাউডে যুক্ত থাকবে।
- **ফ্রন্টএন্ড (React + Three.js):** রেন্ডারের **Static Site** হিসেবে চলবে। এটি বিশ্বের দ্রুততম সিডিএন (CDN) থেকে সার্ভ হবে।

### ২. ডিপ্লয় করার ২টি সহজ পদ্ধতি:
1. **ব্লুপ্রিন্ট পদ্ধতি (সবচেয়ে সহজ):**
   - গিটহাবে কোড পুশ করার পর Render ড্যাশবোর্ডে গিয়ে **New +** &rarr; **Blueprint** সিলেক্ট করুন।
   - রিপোজিটরি সিলেক্ট করলে রেন্ডার স্বয়ংক্রিয়ভাবে `render.yaml` ফাইলটি পড়ে ফ্রন্টএন্ড এবং ব্যাকএন্ড সার্ভিস দুটি তৈরি করে ফেলবে।
   - শুধুমাত্র আপনার সুপাবেসের `DATABASE_URL` টি রেন্ডারের ইনপুট বক্সে পেস্ট করে দিন।
2. **ম্যানুয়াল ড্যাশবোর্ড পদ্ধতি:**
   - যদি ব্লুপ্রিন্ট ব্যবহার না করতে চান, তবে উপরে সেকশন ৩-এ উল্লেখিত সেটিংস অনুযায়ী ব্যাকএন্ড এবং ফ্রন্টএন্ড আলাদাভাবে তৈরি করতে পারবেন।

### ৩. ফ্রি টিয়ারের সীমা ও কোল্ড স্টার্ট (Cold Start) সম্পর্কে তথ্য:
- **ব্যাকএন্ড স্লিপ (Sleep):** রেন্ডার ফ্রি টিয়ারে ব্যাকএন্ডে ১৫ মিনিট কোনো ভিজিটর না থাকলে সার্ভারটি স্লিপ মোডে চলে যায়। এরপর কেউ প্রথমবার সাইটে ঢুকলে সার্ভার আবার চালু হতে **৪৫ থেকে ৫৫ সেকেন্ড** সময় লাগতে পারে (এটিকে "কোল্ড স্টার্ট" বলা হয়)। প্রথমবার চালু হওয়ার পর সাইট আবার স্বাভাবিক সুপারফাস্ট গতিতে চলবে।
- **ফ্রন্টএন্ড (No Cold Start):** ফ্রন্টএন্ড স্ট্যাটিক সাইট হওয়ায় এটি কখনোই স্লিপে যাবে না; ২৪ ঘণ্টাই নিমেষে পেজ ওপেন হবে।
- **সুপাবেস ডাটাবেজ:** সুপাবেসের ফ্রি প্রজেক্টে ৭ দিন কোনো কুয়েরি না হলে প্রজেক্ট পজ হয়। স্বাভাবিক ব্যবহার বজায় রাখলে এটি সর্বদা সচল থাকবে।
