#!/bin/bash

# Production preparation script for AI Interview Coach
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🚀 AI Interview Coach - Production Preparation"
echo "============================================="
echo

# Check if we're in the right directory
if [[ ! -f "package.json" ]] && [[ ! -d "frontend" ]]; then
    log_error "Please run this script from the project root directory"
    exit 1
fi

# Step 1: Check prerequisites
log_info "Step 1: Checking prerequisites..."

# Check for required files
required_files=(
    "frontend/package.json"
    "backend/requirements.txt"
    "backend/docker-compose.yml"
    "scripts/deploy.sh"
)

for file in "${required_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        log_error "Required file missing: $file"
        exit 1
    fi
done

log_success "All required files present"

# Step 2: Create production environment files
log_info "Step 2: Setting up environment files..."

# Backend production env
if [[ ! -f ".env.production" ]]; then
    log_info "Creating backend .env.production file..."
    cat > .env.production << EOF
# Production Environment Configuration
# IMPORTANT: Update these values before deployment!

# === REQUIRED - UPDATE THESE ===
OPENAI_API_KEY=your_openai_api_key_here
REDIS_PASSWORD=change_this_secure_password

# === UPDATE WITH YOUR DOMAINS ===
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://ws.yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# === GENERATE SECURE SECRETS ===
JWT_SECRET_KEY=generate_32_character_random_string_here

# === API Configuration ===
MODEL_NAME=gpt-4
TEMPERATURE=0.3
MAX_TOKENS=500

# === Server Configuration ===
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO
WORKERS=4
HOST=0.0.0.0

# === Security ===
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# === WebSocket Configuration ===
WS_PORT=8001
WS_HOST=0.0.0.0
MAX_CLIENTS=50

# === Monitoring ===
PROMETHEUS_ENABLED=true
EOF
    log_warning "Created .env.production - PLEASE UPDATE THE VALUES!"
else
    log_info ".env.production already exists"
fi

# Frontend production env
if [[ ! -f "frontend/.env.production" ]]; then
    log_info "Creating frontend .env.production file..."
    cat > frontend/.env.production << EOF
# Frontend Production Environment
# Update these URLs with your actual backend deployment

NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://ws.yourdomain.com
NEXT_PUBLIC_APP_NAME="AI Interview Coach"
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENVIRONMENT=production

# Optional: Analytics and monitoring
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_SENTRY_DSN=
EOF
    log_warning "Created frontend/.env.production - PLEASE UPDATE THE URLs!"
else
    log_info "frontend/.env.production already exists"
fi

# Step 3: Generate secure secrets
log_info "Step 3: Generating secure secrets..."

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
REDIS_PASSWORD=$(openssl rand -base64 24 2>/dev/null || head -c 24 /dev/urandom | base64)

log_info "Generated secure secrets (save these):"
echo "JWT_SECRET_KEY=$JWT_SECRET"
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
echo

# Step 4: Check Docker setup
log_info "Step 4: Checking Docker setup..."

if command -v docker &> /dev/null; then
    log_success "Docker is installed"
    if docker info &> /dev/null; then
        log_success "Docker daemon is running"
    else
        log_warning "Docker daemon is not running"
    fi
else
    log_warning "Docker is not installed (required for local deployment)"
fi

if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    log_success "Docker Compose is available"
else
    log_warning "Docker Compose is not available"
fi

# Step 5: Test builds
log_info "Step 5: Testing builds..."

# Test frontend build
log_info "Testing frontend build..."
cd frontend
if npm install && npm run build; then
    log_success "Frontend build successful"
else
    log_error "Frontend build failed"
    cd ..
    exit 1
fi
cd ..

# Test backend Docker build
log_info "Testing backend Docker build..."
if docker build -t test-fastapi backend/backend/fastapi/; then
    log_success "Backend Docker build successful"
    docker rmi test-fastapi 2>/dev/null || true
else
    log_error "Backend Docker build failed"
    exit 1
fi

# Step 6: Create deployment checklist
log_info "Step 6: Creating deployment checklist..."

cat > DEPLOYMENT_CHECKLIST.md << EOF
# 🚀 Deployment Checklist

## Pre-Deployment
- [ ] Updated .env.production with real values
- [ ] Updated frontend/.env.production with real backend URLs
- [ ] Obtained OpenAI API key
- [ ] Generated secure JWT_SECRET_KEY and REDIS_PASSWORD
- [ ] Chosen hosting platform (Railway, Digital Ocean, etc.)
- [ ] Registered domain name (optional)

## Backend Deployment
- [ ] Choose hosting platform:
  - [ ] Railway (recommended for beginners)
  - [ ] Digital Ocean App Platform
  - [ ] Google Cloud Run
  - [ ] Traditional VPS

## Frontend Deployment (Vercel)
- [ ] Push code to GitHub
- [ ] Connect repository to Vercel
- [ ] Set root directory to 'frontend'
- [ ] Add environment variables
- [ ] Deploy and test

## Post-Deployment
- [ ] Test frontend loads correctly
- [ ] Test API health endpoint
- [ ] Test WebSocket connection
- [ ] Test audio transcription
- [ ] Test AI feedback functionality
- [ ] Set up monitoring/alerts
- [ ] Configure custom domain (if applicable)
- [ ] Set up SSL certificates

## Production URLs to Test
- [ ] https://yourdomain.com (frontend)
- [ ] https://api.yourdomain.com/health (API health)
- [ ] wss://ws.yourdomain.com (WebSocket)

## Security Checklist
- [ ] All secrets are properly configured
- [ ] CORS origins are restricted to your domain
- [ ] SSL/TLS is properly configured
- [ ] API keys are not exposed in frontend
- [ ] Rate limiting is enabled
EOF

log_success "Created DEPLOYMENT_CHECKLIST.md"

# Step 7: Git preparation
log_info "Step 7: Preparing for Git..."

# Create .gitignore additions if not present
if ! grep -q ".env.production" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# Production environment files" >> .gitignore
    echo ".env.production" >> .gitignore
    echo "frontend/.env.production" >> .gitignore
    log_info "Added production env files to .gitignore"
fi

# Step 8: Final instructions
echo
log_success "🎉 Production preparation complete!"
echo
echo "Next steps:"
echo "1. Update .env.production with your real values:"
echo "   - OpenAI API key"
echo "   - Secure passwords"
echo "   - Your domain names"
echo
echo "2. Choose your deployment method:"
echo "   📖 See DEPLOYMENT_GUIDE.md for detailed instructions"
echo
echo "3. Quick start options:"
echo "   🚀 Railway (easiest): railway.app"
echo "   🌊 Digital Ocean: digitalocean.com"
echo "   ⚡ Vercel (frontend): vercel.com"
echo
echo "4. Use the deployment scripts:"
echo "   ./scripts/deploy.sh deploy    # For local Docker deployment"
echo "   ./scripts/deploy.sh health    # Check service health"
echo
echo "📋 Follow DEPLOYMENT_CHECKLIST.md for step-by-step guidance"
echo
log_warning "Remember: Never commit .env.production files to Git!"
EOF
