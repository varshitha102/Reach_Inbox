# Deployment Guide - Vercel + Railway

This guide provides step-by-step instructions for deploying ReachInbox to production using Vercel for the frontend and Railway for the backend infrastructure.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel                                │
│                    Frontend (React)                          │
│                  https://your-app.vercel.app                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ API Calls
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      Railway Account 1                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Backend    │  │    Worker    │  │    MySQL     │      │
│  │     API      │  │              │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                            │                                 │
│                    ┌───────┴───────┐                         │
│                    │     Redis     │                         │
│                    └───────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

Before starting, ensure you have:

- [ ] GitHub account
- [ ] Vercel account (https://vercel.com)
- [ ] Railway account (https://railway.app)
- [ ] Google Cloud Console account (for OAuth)
- [ ] Ethereal Email account (for SMTP)
- [ ] Node.js 18+ installed locally
- [ ] Git installed locally

## Step 1: Prepare Code for Deployment

### 1.1 Initialize Git Repository

```bash
cd d:\ReachInbox
git init
git add .
git commit -m "Initial commit - ReachInbox assignment"
git branch -M main
```

### 1.2 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `reachinbox-assignment`
3. Make it Public or Private (your choice)
4. Click "Create repository"
5. Copy the repository URL

### 1.3 Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/reachinbox-assignment.git
git push -u origin main
```

## Step 2: Deploy Backend Infrastructure to Railway

### 2.1 Create Railway Account

1. Go to https://railway.app/
2. Sign up with GitHub (recommended)
3. Verify your email

### 2.2 Create New Railway Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Authorize Railway to access your GitHub
4. Select `reachinbox-assignment` repository
5. Click "Import"

### 2.3 Add MySQL Database

1. In your Railway project, click "+ New Service"
2. Select "Database" → "MySQL"
3. Railway will provision MySQL automatically
4. Wait for MySQL to be healthy (green checkmark)
5. Click on MySQL service
6. Go to "Variables" tab
7. Copy `DATABASE_URL` - you'll need this later

### 2.4 Add Redis

1. Click "+ New Service"
2. Select "Database" → "Redis"
3. Railway will provision Redis automatically
4. Wait for Redis to be healthy (green checkmark)
5. Click on Redis service
6. Go to "Variables" tab
7. Copy `REDIS_HOST` and `REDIS_PORT` - you'll need these later

### 2.5 Add Backend API Service

1. Click "+ New Service"
2. Select "Deploy from GitHub repo"
3. Select `reachinbox-assignment` repository
4. Configure the service:

**Settings:**
- **Name:** `backend-api`
- **Root Directory:** `apps/backend`
- **Build Command:** `npm run build`
- **Start Command:** `npm start`

**Health Check:**
- **Health Check Path:** `/health`
- **Health Check Timeout:** 30s

**Environment Variables:**
Add the following variables (click "Add Variable" for each):

```env
# Server
PORT=3001
NODE_ENV=production

# Database (from MySQL service)
# Railway provides MYSQL_URL - reference it as DATABASE_URL
DATABASE_URL=${{MySQL.MYSQL_URL}}

# Redis (from Redis service)
# Railway provides REDIS_URL - reference it directly
REDIS_URL=${{Redis.REDIS_URL}}

# Frontend URL (update after Vercel deployment)
FRONTEND_URL=https://your-frontend.vercel.app

# Session Secret (generate with: openssl rand -base64 32)
SESSION_SECRET=<generate-random-string>

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=https://your-backend.railway.app/auth/google/callback

# Ethereal SMTP
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=<your-ethereal-username>
SMTP_PASSWORD=<your-ethereal-password>
SMTP_FROM=<your-ethereal-email>
DEFAULT_SENDER_NAME=ReachInbox

# Worker Configuration
WORKER_CONCURRENCY=5

# Rate Limiting
DEFAULT_MIN_DELAY_MS=1000
DEFAULT_EMAILS_PER_HOUR=100

# Test Mode
TEST_MODE=false
```

5. Click "Deploy"
6. Wait for deployment to complete
7. Copy the backend URL (e.g., `https://your-backend.railway.app`)

### 2.6 Add Worker Service

1. Click "+ New Service"
2. Select "Deploy from GitHub repo"
3. Select `reachinbox-assignment` repository
4. Configure the service:

**Settings:**
- **Name:** `email-worker`
- **Root Directory:** `apps/backend`
- **Build Command:** `npm run build`
- **Start Command:** `npm run start:worker`

**Environment Variables:**
Copy ALL the same environment variables from the Backend API service.

5. Click "Deploy"
6. Wait for deployment to complete
7. Verify worker is running (green checkmark)

### 2.7 Run Database Migrations

1. In the Backend API service settings, go to "Settings" tab
2. Scroll to "Deploy Hooks"
3. Add a "Pre-build" hook:
   ```bash
   npx prisma migrate deploy
   ```
4. This ensures migrations run before the server starts
5. Alternatively, you can run migrations manually via Railway Console:
   - Click on Backend API service
   - Click "Console" tab
   - Click "New Console"
   - Run: `npx prisma migrate deploy`

### 2.8 Verify Deployment

1. Click on the Backend API service
2. Go to "Settings" → "Deployments"
3. Click the latest deployment
4. Click "View Logs"
5. Look for successful startup messages:
   - "Database connected successfully"
   - "Redis connected"
   - "API server running on port 3001"
6. Test the health endpoint:
   - Visit: `https://your-backend.railway.app/health`
   - Should return: `{"status":"ok",...}`

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account

1. Go to https://vercel.com/
2. Sign up with GitHub (recommended)
3. Verify your email

### 3.2 Deploy Frontend

1. Click "Add New Project"
2. Select `reachinbox-assignment` repository
3. Configure the project:

**Framework Preset:** Vite

**Build & Development Settings:**
- **Root Directory:** `apps/frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

**Environment Variables:**
```env
VITE_API_URL=https://your-backend.railway.app
```

4. Click "Deploy"
5. Wait for deployment to complete
6. Copy the frontend URL (e.g., `https://your-app.vercel.app`)

### 3.3 Update Backend FRONTEND_URL

1. Go back to Railway
2. Click on Backend API service
3. Go to "Variables" tab
4. Update `FRONTEND_URL` with your actual Vercel URL
5. Click "Save Changes"
6. Railway will redeploy automatically

## Step 4: Configure Google OAuth

### 4.1 Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"
4. Create OAuth 2.0 Client ID:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "ReachInbox"
   - Authorized redirect URIs:
     - `http://localhost:3001/auth/google/callback` (local)
     - `https://your-backend.railway.app/auth/google/callback` (production)
   - Click "Create"
5. Copy Client ID and Client Secret

### 4.2 Update Railway Environment Variables

1. Go to Railway → Backend API service
2. Update `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
3. Update `GOOGLE_CALLBACK_URL` with your actual Railway backend URL
4. Click "Save Changes"
5. Railway will redeploy

## Step 5: Configure Ethereal SMTP

### 5.1 Get Ethereal Credentials

1. Go to [Ethereal Email](https://ethereal.email/)
2. Click "Create Ethereal Account"
3. Copy the credentials:
   - SMTP Host
   - SMTP Port
   - Username
   - Password
   - From Email

### 5.2 Update Railway Environment Variables

1. Go to Railway → Backend API service
2. Update SMTP environment variables
3. Click "Save Changes"
4. Update Worker service with same SMTP variables
5. Click "Save Changes"

## Step 6: Verify Deployment

### 6.1 Check Frontend

1. Visit your Vercel frontend URL
2. Verify the page loads
3. Try to login with Google OAuth
4. Verify login works

### 6.2 Check Backend

1. Visit `https://your-backend.railway.app/api/health`
2. Should return health status

### 6.3 Check Worker

1. Go to Railway → Worker service
2. Click "View Logs"
3. Verify worker is running without errors
4. Look for "Worker started successfully" message

### 6.4 Test Email Scheduling

1. Login to the application
2. Go to Compose page
3. Add a recipient
4. Write a test email
5. Schedule for a few minutes in the future
6. Submit the form
7. Check Railway logs for job processing
8. Check Ethereal for email delivery

## Step 7: Monitor and Debug

### Railway Monitoring

1. Go to Railway project
2. Click on any service to view:
   - Metrics (CPU, memory, network)
   - Logs
   - Deployments
   - Environment variables

### Vercel Monitoring

1. Go to Vercel project
2. View:
   - Deployments
   - Logs
   - Analytics
   - Settings

### Common Issues

**Worker not processing jobs:**
- Check Redis connection in worker logs
- Verify worker has same environment variables as backend
- Check BullMQ queue status

**Google OAuth failing:**
- Verify callback URL matches exactly
- Check Google Cloud Console for errors
- Ensure client ID/secret are correct

**Database connection errors:**
- Verify DATABASE_URL is correct
- Check MySQL service is healthy
- Ensure migrations ran successfully

**Emails not sending:**
- Verify Ethereal credentials
- Check worker logs for SMTP errors
- Ensure TEST_MODE is set to false

## Step 8: Update DNS (Optional)

If you have a custom domain:

### Vercel Custom Domain

1. Go to Vercel project → Settings → Domains
2. Add your custom domain
3. Follow DNS instructions
4. Wait for SSL certificate

### Railway Custom Domain

1. Go to Railway project → Settings → Domains
2. Add your custom domain for backend
3. Follow DNS instructions
4. Update Google OAuth callback URL
5. Update frontend VITE_API_URL

## Cost Breakdown

### Vercel
- Free tier: 100GB bandwidth, unlimited deployments
- Pro: $20/month (additional bandwidth, analytics)

### Railway
- Free tier: $5 credit one-time
- After free tier:
  - Backend API: ~$5-10/month
  - Worker: ~$5-10/month
  - MySQL: ~$5-10/month
  - Redis: ~$5-10/month
  - **Total:** ~$20-40/month

### Total Estimated Cost
- **Free tier:** $0 (until Railway credit expires)
- **Production:** ~$20-60/month

## Scaling Considerations

### When to Scale

- Increase `WORKER_CONCURRENCY` if emails queue up
- Add more worker instances for high volume
- Upgrade MySQL plan for large databases
- Consider Redis cluster for high throughput

### Scaling Steps

1. Go to Railway → Worker service
2. Update `WORKER_CONCURRENCY` environment variable
3. Or add multiple worker services
4. Monitor metrics and adjust accordingly

## Security Checklist

- [ ] SESSION_SECRET is a strong random string
- [ ] Google OAuth credentials are from a real project
- [ ] Ethereal credentials are valid
- [ ] All environment variables are set in production
- [ ] No secrets are committed to Git
- [ ] HTTPS is enabled (automatic on Vercel/Railway)
- [ ] Database and Redis are not publicly accessible
- [ ] Worker has same authentication as backend

## Backup Strategy

### Database Backups

Railway automatically backs up MySQL:
- Daily backups retained for 7 days
- Manual backups can be created in Railway dashboard

### Redis Backups

Redis is ephemeral but BullMQ jobs persist:
- Jobs are stored in Redis with TTL
- Critical data is in MySQL database
- If Redis is lost, jobs can be recreated from DB

## Rollback Procedure

### If Deployment Fails

1. Go to Railway → Service → Deployments
2. Click on previous successful deployment
3. Click "Redeploy"
4. Wait for rollback to complete

### Vercel Rollback

1. Go to Vercel → Deployments
2. Click on previous successful deployment
3. Click "Promote to Production"

## Support Resources

- Railway Documentation: https://docs.railway.app/
- Vercel Documentation: https://vercel.com/docs
- BullMQ Documentation: https://docs.bullmq.io/
- Prisma Documentation: https://www.prisma.io/docs

## Next Steps

After successful deployment:

1. Set up monitoring alerts
2. Configure custom domains
3. Set up analytics (Vercel Analytics)
4. Implement error tracking (Sentry, etc.)
5. Set up CI/CD pipeline
6. Add automated tests
7. Configure staging environment
