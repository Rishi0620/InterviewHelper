# 🚀 Production Deployment Guide

## Overview

Your application has two main components:
- **Frontend**: Next.js app (can deploy to Vercel)
- **Backend**: FastAPI + WebSocket services (need container hosting)

## 🎯 Recommended Production Architecture

```
Frontend (Vercel) → Backend (Railway/Digital Ocean) → External Services
     ↓                        ↓                           ↓
  Next.js App          Docker Containers            OpenAI API
                      - FastAPI (port 8000)
                      - WebSocket (port 8001)  
                      - Redis (port 6379)
                      - Nginx (reverse proxy)
```

## 📋 Prerequisites

Before deploying, ensure you have:
- [ ] OpenAI API key
- [ ] GitHub repository
- [ ] Domain name (optional but recommended)
- [ ] SSL certificates (for custom domain)

## 🔧 Step 1: Prepare for Deployment

### 1.1 Create Production Environment File

```bash
# Create production environment file
cp .env.example .env.production

# Edit with your production values
nano .env.production
```

**Required variables:**
```env
# Essential
OPENAI_API_KEY=your_real_openai_api_key
ENVIRONMENT=production
REDIS_PASSWORD=secure_random_password_here

# URLs (update with your actual domains)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://ws.yourdomain.com

# Security
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
JWT_SECRET_KEY=generate_32_character_random_string
```

### 1.2 Update Frontend Environment

Create `.env.production` in the frontend directory:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://ws.yourdomain.com
NEXT_PUBLIC_ENVIRONMENT=production
```

## 🌐 Step 2: Frontend Deployment (Vercel)

### 2.1 Push to GitHub
```bash
# Add all changes
git add .
git commit -m "Production-ready frontend and backend"
git push origin main
```

### 2.2 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "New Project" and select your repository
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

4. Add environment variables in Vercel dashboard:
   ```
   NEXT_PUBLIC_API_URL = https://api.yourdomain.com
   NEXT_PUBLIC_WS_URL = wss://ws.yourdomain.com
   NEXT_PUBLIC_ENVIRONMENT = production
   ```

5. Deploy!

## 🖥️ Step 3: Backend Deployment Options

### Option A: Railway (Recommended - Easiest)

**Pros**: Simple setup, built-in Redis, automatic SSL, reasonable pricing
**Cons**: Newer platform, limited regions

#### Steps:
1. Go to [railway.app](https://railway.app) and sign up
2. Create new project from GitHub repo
3. Add three services:
   - **FastAPI Service**: 
     - Root directory: `backend/backend/fastapi`
     - Start command: `uvicorn main:app --host 0.0.0.0 --port 8000`
   - **WebSocket Service**:
     - Root directory: `backend/backend/websocket`  
     - Start command: `python server.py`
   - **Redis Service**: Use Railway's built-in Redis addon

4. Set environment variables for each service
5. Configure custom domains

### Option B: Digital Ocean App Platform

**Pros**: Reliable, good documentation, predictable pricing
**Cons**: Slightly more complex setup

#### Steps:
1. Create Digital Ocean account
2. Use App Platform with your GitHub repo
3. Configure app.yaml:

```yaml
name: interview-coach
services:
- name: fastapi
  source_dir: backend/backend/fastapi
  github:
    repo: your-username/your-repo
    branch: main
  run_command: uvicorn main:app --host 0.0.0.0 --port 8000
  environment_slug: python
  instance_count: 1
  instance_size_slug: basic-xxs
  
- name: websocket
  source_dir: backend/backend/websocket
  run_command: python server.py
  environment_slug: python
  instance_count: 1
  instance_size_slug: basic-xxs
  
databases:
- engine: REDIS
  name: redis
  num_nodes: 1
  size: basic-xxs
```

### Option C: Google Cloud Run (Most Scalable)

**Pros**: Serverless, auto-scaling, pay per use
**Cons**: More complex setup, cold starts

#### Steps:
1. Build and push Docker images to Google Container Registry
2. Deploy each service to Cloud Run
3. Set up Redis using Google Cloud Memorystore
4. Configure custom domains and SSL

### Option D: Traditional VPS (Most Control)

**Pros**: Full control, cost-effective for high traffic
**Cons**: Requires server management skills

#### Steps:
1. Get VPS from DigitalOcean, Linode, or AWS EC2
2. Install Docker and Docker Compose
3. Upload your code and run:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## 🔒 Step 4: Domain and SSL Setup

### 4.1 Domain Configuration
Point your domain DNS to your backend hosting:
```
api.yourdomain.com → Backend IP/URL
ws.yourdomain.com → WebSocket IP/URL (can be same as API)
```

### 4.2 SSL Certificates
Most hosting platforms provide automatic SSL. For custom setup:
```bash
# Using Let's Encrypt
certbot --nginx -d api.yourdomain.com -d ws.yourdomain.com
```

## 📊 Step 5: Monitoring Setup

### 5.1 Error Tracking
Add Sentry to both frontend and backend:
```bash
# Frontend
npm install @sentry/nextjs

# Backend  
pip install sentry-sdk[fastapi]
```

### 5.2 Uptime Monitoring
Use services like:
- UptimeRobot (free)
- Pingdom
- StatusCake

## 🚀 Step 6: Deploy Using Our Scripts

### 6.1 Automated Deployment
```bash
# Make sure you're in the project root
cd /Users/rishabhbhargav/Desktop/InterviewHelper

# Run the production deployment
./scripts/deploy.sh deploy
```

### 6.2 Health Checks
```bash
# Check all services are healthy
./scripts/deploy.sh health

# View deployment status
./scripts/deploy.sh status
```

## 🔧 Quick Start: Railway Deployment (Recommended)

Here's the fastest way to get to production:

### 1. Push to GitHub
```bash
git add .
git commit -m "Production ready"
git push origin main
```

### 2. Deploy Frontend to Vercel
- Connect GitHub repo
- Set root directory to `frontend`
- Add environment variables
- Deploy

### 3. Deploy Backend to Railway
- Connect GitHub repo  
- Create 3 services: FastAPI, WebSocket, Redis
- Set environment variables
- Deploy

### 4. Update Frontend URLs
Once backend is deployed, update Vercel environment variables with real URLs.

## 💰 Cost Estimates

### Starter Setup (~$25-50/month):
- **Vercel**: Free (Pro: $20/month for team features)
- **Railway**: ~$5-20/month for backend services
- **Domain**: ~$10-15/year
- **OpenAI API**: Pay per use (~$10-50/month depending on usage)

### Scaling Up (~$100-200/month):
- **Vercel Pro**: $20/month
- **Railway Pro**: $50-100/month
- **Monitoring**: $20-50/month
- **CDN**: $10-30/month

## 🔍 Environment-Specific Configurations

### Development
```env
ENVIRONMENT=development
DEBUG=true
CORS_ORIGINS=http://localhost:3000
```

### Staging  
```env
ENVIRONMENT=staging
DEBUG=false
CORS_ORIGINS=https://staging.yourdomain.com
```

### Production
```env
ENVIRONMENT=production
DEBUG=false
CORS_ORIGINS=https://yourdomain.com
```

## 📋 Post-Deployment Checklist

- [ ] Frontend loads correctly
- [ ] API health check returns 200
- [ ] WebSocket connection works
- [ ] Audio transcription functional
- [ ] AI feedback working
- [ ] Error pages display correctly
- [ ] SSL certificates valid
- [ ] Domain redirects working
- [ ] Environment variables secure
- [ ] Monitoring alerts configured

## 🚨 Troubleshooting Common Issues

### Frontend can't connect to backend
- Check CORS origins in backend
- Verify API URLs in frontend environment
- Ensure SSL/TLS configuration

### WebSocket connection fails
- Check firewall settings
- Verify WebSocket URL protocol (ws vs wss)
- Test with browser developer tools

### OpenAI API errors
- Verify API key is correct
- Check billing and usage limits
- Review rate limiting settings

## 📞 Support Resources

- **Railway**: [docs.railway.app](https://docs.railway.app)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Digital Ocean**: [docs.digitalocean.com](https://docs.digitalocean.com)
- **Our deployment scripts**: Run `./scripts/deploy.sh` for help
