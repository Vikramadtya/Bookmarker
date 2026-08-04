# 🚀 Zero-Cost Deployment & CI/CD Strategy

To deploy Bookmarker for $0 upfront with a professional CI/CD pipeline, we will leverage the best free-tier cloud providers available. Because Bookmarker has multiple moving parts (Frontend, Backend, MongoDB, Redis), we need to distribute them to specialized hosts.

---

## 🏗️ Architecture (The Free Stack)

| Service        | Technology   | Cloud Provider | Free Tier Limits                                                                   |
| -------------- | ------------ | -------------- | ---------------------------------------------------------------------------------- |
| Frontend       | React + Vite | Vercel         | 100GB Bandwidth, automatic CI/CD on push.                                          |
| Backend        | NestJS       | Render         | Free Web Service. (Spins down after 15 mins of inactivity; takes ~30s to wake up). |
| Database       | MongoDB      | MongoDB Atlas  | M0 Cluster: 512MB storage, shared RAM.                                             |
| Queue (BullMQ) | Redis        | Upstash        | Free serverless Redis, up to 10,000 requests/day.                                  |
| CI/CD          | Automation   | GitHub Actions | 2,000 free action minutes per month (free forever for public repos).               |

> [!IMPORTANT]
> **Deploy in this exact order**: MongoDB Atlas → Upstash Redis → Backend on Render → Frontend on Vercel.
> Each step produces a URL/secret that the next step needs.

---

## 🛠️ Step-by-Step Deployment Guide

### Phase 1: Managed Databases (MongoDB & Redis)

#### MongoDB Atlas

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create a free account.
2. Create a free **M0 cluster** — choose **AWS** and a region close to you (e.g. `us-east-1`). Same region as Render's `Oregon (US West)` or `Ohio (US East)` for best latency.
3. Under **Database Access**, create a database user with username + password. Save these.
4. Under **Network Access**, click **Add IP Address → Allow Access from Anywhere** (`0.0.0.0/0`). Required because Render's outbound IPs change.
5. Click **Connect → Drivers** and copy the `MONGODB_URI`. Replace `<password>` with your actual password.

```
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/bookmarker?retryWrites=true&w=majority
```

#### Upstash Redis

1. Go to [console.upstash.com](https://console.upstash.com) and create a free account.
2. Create a new **Redis database** — choose the region closest to your Render backend.
3. From the database dashboard, scroll down to the "Node" tab and copy the **REDIS_URL**. It will look something like this:
   `rediss://default:gQAA...@touched-meerkat-209488.upstash.io:6379`

---

### Phase 2: Backend on Render

> Deploy the backend **before** the frontend so you have the Render URL to give to Vercel.

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. Click **New → Web Service** and connect your repository.
3. Configure the service:

   | Setting               | Value                          |
   | --------------------- | ------------------------------ |
   | **Root Directory**    | `backend`                      |
   | **Runtime**           | `Node`                         |
   | **Build Command**     | `npm install && npm run build` |
   | **Start Command**     | `npm run start:prod`           |
   | **Instance Type**     | Free                           |
   | **Health Check Path** | `/health`                      |

4. Set the following **Environment Variables** in the Render dashboard:

   | Variable               | Value                                                     |
   | ---------------------- | --------------------------------------------------------- |
   | `MONGODB_URI`          | From Atlas (e.g., `mongodb+srv://...`)                    |
   | `REDIS_URL`            | From Upstash (e.g., `rediss://...`)                       |
   | `GOOGLE_CLIENT_ID`     | From Google Cloud Console                                 |
   | `GOOGLE_CLIENT_SECRET` | From Google Cloud Console                                 |
   | `GOOGLE_CALLBACK_URL`  | `https://your-app.onrender.com/auth/google/callback`      |
   | `FRONTEND_URL`         | `https://your-app.vercel.app` _(set after Vercel deploy)_ |
   | `JWT_SECRET`           | Run `openssl rand -base64 32` locally and paste result    |
   | `NODE_ENV`             | `production`                                              |
   | `LOG_LEVEL`            | `info`                                                    |

5. Click **Create Web Service**. Note the URL Render gives you (e.g. `https://bookmarker-api.onrender.com`).

6. **Update Google Cloud Console**:
   - Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → your OAuth client.
   - Add `https://your-app.onrender.com` to **Authorized JavaScript Origins**.
   - Add `https://your-app.onrender.com/auth/google/callback` to **Authorized Redirect URIs**.

---

### Phase 3: Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New → Project** and import your repository.
3. Configure the build:

   | Setting              | Value           |
   | -------------------- | --------------- |
   | **Framework Preset** | Vite            |
   | **Root Directory**   | `frontend`      |
   | **Build Command**    | `npm run build` |
   | **Output Directory** | `dist`          |

4. Set the following **Environment Variables**:

   | Variable       | Value                                  |
   | -------------- | -------------------------------------- |
   | `VITE_API_URL` | `https://your-app.onrender.com/api/v1` |

5. Click **Deploy**. Note the Vercel URL (e.g. `https://bookmarker.vercel.app`).

6. **Go back to Render** and update `FRONTEND_URL` to your Vercel URL. Render will redeploy automatically.

---

### Phase 4: Post-Deploy Verification Checklist

After both services are live, verify the following:

- [ ] Open `https://your-app.vercel.app` — the landing page loads
- [ ] Click "Get Started" — Google OAuth redirects correctly
- [ ] After login, the sidebar loads folders (Inbox should auto-create)
- [ ] Save a bookmark — it appears with "Scraping..." then updates in real-time via WebSocket
- [ ] Open `https://your-app.onrender.com/api/docs` — Swagger docs are visible
- [ ] Open `https://your-app.onrender.com/health` — returns `{ "status": "ok" }`

---

## ⚙️ CI/CD Pipeline (GitHub Actions)

The pipeline is already configured at `.github/workflows/ci.yml`. It runs two **parallel** jobs on every push to `main` and every Pull Request:

```
push to main / PR opened
       │
       ├─── [backend job] npm ci → nest build → jest
       │
       └─── [frontend job] npm ci → vite build
               │
               ▼
          Both pass ✅
               │
               ├─── Render auto-deploys backend
               └─── Vercel auto-deploys frontend
```

> [!NOTE]
> The `npm` dependency cache is correctly scoped to each subdirectory (`backend/package-lock.json` and `frontend/package-lock.json`) so caching works correctly in the monorepo layout.

---

## ⚠️ Known Limitations & Mitigations

### Cold Start on Render Free Tier

Render spins down your backend after **15 minutes of inactivity**. The first request after sleep takes **~30–50 seconds**.

**Mitigation options (free):**

- Use [UptimeRobot](https://uptimerobot.com) (free) to ping `/health` every 14 minutes, keeping the server warm.
- Accept it for a personal project — add a loading indicator on the frontend for the first login.

### Upstash Request Limit

The free tier allows **10,000 Redis commands/day**. Each scrape job uses ~3–5 commands. At 2,000 bookmarks imported/day you'd hit the limit — but for personal use this is more than sufficient.

### MongoDB Atlas Storage

The free M0 cluster has **512MB storage**. At ~2KB per bookmark, that's ~250,000 bookmarks before you need to upgrade.

---

## 🔐 Security Notes for Production

- `JWT_SECRET` **must** be set — the app will fail to start if missing (fail-fast is implemented).
- CORS is restricted to `FRONTEND_URL` only — no wildcard origins.
- The JWT cookie is `httpOnly` and `sameSite: lax` — not readable by JavaScript.
- All search queries are regex-escaped to prevent ReDoS attacks.
- WebSocket events are scoped to per-user rooms — no data leaks between users.
