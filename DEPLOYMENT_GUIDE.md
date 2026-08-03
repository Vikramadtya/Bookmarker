# 🚀 Zero-Cost Deployment & CI/CD Strategy

To deploy Bookmarker for $0 upfront with a professional CI/CD pipeline, we will leverage the best free-tier cloud providers available. Because Bookmarker has multiple moving parts (Frontend, Backend, MongoDB, Redis), we need to distribute them to specialized hosts.

## 🏗️ Architecture (The Free Stack)

| Service        | Technology   | Cloud Provider | Free Tier Limits                                                                   |
| -------------- | ------------ | -------------- | ---------------------------------------------------------------------------------- |
| Frontend       | React + Vite | Vercel         | 100GB Bandwidth, automatic CI/CD on push.                                          |
| Backend        | NestJS       | Render         | Free Web Service. (Spins down after 15 mins of inactivity; takes ~30s to wake up). |
| Database       | MongoDB      | MongoDB Atlas  | M0 Cluster: 512MB storage, shared RAM.                                             |
| Queue (BullMQ) | Redis        | Upstash        | Free serverless Redis, up to 10,000 requests/day.                                  |
| CI/CD          | Automation   | GitHub Actions | 2,000 free action minutes per month (free forever for public repos).               |

## 🛠️ Step-by-Step Deployment Guide

### Phase 1: Managed Databases (MongoDB & Redis)

**MongoDB Atlas:**

1. Create a free M0 cluster in AWS (choose a region close to your backend, e.g., US East).
2. Create a database user and whitelist `0.0.0.0/0` (allow access from anywhere since Render IP addresses change).
3. Get the connection string (`MONGODB_URI`).

**Upstash Redis:**

1. Create a free Redis database.
2. Copy the Redis URL (`REDIS_URL`) and password.

### Phase 2: Frontend on Vercel

1. Push your code to a GitHub repository.
2. Sign in to Vercel with GitHub and import the repository.
3. Configure the build:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Environment Variables**: Set `VITE_API_URL` to your future backend URL (e.g., `https://bookmarker-api.onrender.com/api/v1`).
4. Click Deploy. Vercel automatically sets up CI/CD. Every time you push to `main`, Vercel will rebuild and deploy the frontend.

### Phase 3: Backend on Render

1. Sign in to Render and create a new Web Service.
2. Connect your GitHub repository.
3. Configure the service:
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
4. Set Environment Variables:
   - `MONGODB_URI`: From Atlas
   - `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`: From Upstash
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: (Update your Google Cloud Console authorized domains to include your Render URL!)
   - `FRONTEND_URL`: Your Vercel URL
   - `JWT_SECRET`: A random secure string.
5. Deploy. Render will automatically rebuild your backend when you push to GitHub.

## ⚙️ CI/CD Pipeline (GitHub Actions)

We have already configured a proper CI/CD pipeline at `.github/workflows/ci.yml`.

How this works:

1. When you open a Pull Request or push to `main`, GitHub Actions spins up a free Ubuntu server.
2. It installs dependencies, builds the NestJS backend, and runs your tests.
3. It builds the React frontend to ensure there are no compilation errors.
4. If everything passes ✅, Render and Vercel will automatically deploy the fresh code!

> [!WARNING]
> **The Cold Start Caveat**: Render's free tier puts your backend to "sleep" after 15 minutes of inactivity. When you (or a background scraper) hit the API again, the first request will take ~30-50 seconds to wake the server up. For a personal project, this is highly acceptable for $0/month!
