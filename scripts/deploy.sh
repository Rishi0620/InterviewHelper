#!/bin/bash

# Production deployment script for AI Interview Coach
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${ENVIRONMENT:-production}
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

# Functions
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

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! docker --version &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! docker-compose --version &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if environment file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "Environment file $ENV_FILE not found"
        log_info "Please copy .env.example to $ENV_FILE and configure it"
        exit 1
    fi
    
    # Check if required environment variables are set
    if ! grep -q "OPENAI_API_KEY=" "$ENV_FILE" || grep -q "your_openai_api_key_here" "$ENV_FILE"; then
        log_error "OPENAI_API_KEY is not properly configured in $ENV_FILE"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

backup_data() {
    log_info "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup Redis data if container is running
    if docker ps --format "table {{.Names}}" | grep -q "interview-coach-redis"; then
        log_info "Backing up Redis data..."
        docker exec interview-coach-redis redis-cli --rdb /data/backup.rdb
        docker cp interview-coach-redis:/data/backup.rdb "$BACKUP_DIR/redis_backup.rdb"
    fi
    
    # Backup configuration files
    cp "$ENV_FILE" "$BACKUP_DIR/"
    cp "$COMPOSE_FILE" "$BACKUP_DIR/"
    
    # Backup logs if they exist
    if [[ -d "./logs" ]]; then
        cp -r ./logs "$BACKUP_DIR/"
    fi
    
    log_success "Backup created at $BACKUP_DIR"
}

pull_latest_images() {
    log_info "Pulling latest Docker images..."
    
    # Use docker-compose or docker compose based on availability
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi
    
    $COMPOSE_CMD -f "$COMPOSE_FILE" pull
    
    log_success "Latest images pulled"
}

deploy_services() {
    log_info "Deploying services..."
    
    # Use docker-compose or docker compose based on availability
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi
    
    # Start services with production configuration
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    log_success "Services deployed"
}

wait_for_health() {
    log_info "Waiting for services to become healthy..."
    
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        local healthy_services=0
        local total_services=0
        
        # Check health of all services
        for service in fastapi websocket redis frontend; do
            total_services=$((total_services + 1))
            
            if docker ps --filter "name=interview-coach-$service" --filter "health=healthy" --format "{{.Names}}" | grep -q "interview-coach-$service"; then
                healthy_services=$((healthy_services + 1))
            fi
        done
        
        if [[ $healthy_services -eq $total_services ]]; then
            log_success "All services are healthy"
            return 0
        fi
        
        log_info "Health check progress: $healthy_services/$total_services services healthy"
        sleep 10
        attempt=$((attempt + 1))
    done
    
    log_warning "Some services may not be healthy yet. Check manually with: docker ps"
    return 1
}

run_smoke_tests() {
    log_info "Running smoke tests..."
    
    # Test API health endpoint
    if curl -f -s http://localhost:8000/health > /dev/null; then
        log_success "API health check passed"
    else
        log_error "API health check failed"
        return 1
    fi
    
    # Test WebSocket connection (basic TCP check)
    if timeout 5 bash -c "</dev/tcp/localhost/8001"; then
        log_success "WebSocket connection test passed"
    else
        log_error "WebSocket connection test failed"
        return 1
    fi
    
    # Test Redis connection
    if docker exec interview-coach-redis redis-cli ping | grep -q "PONG"; then
        log_success "Redis connection test passed"
    else
        log_error "Redis connection test failed"
        return 1
    fi
    
    # Test frontend (if running)
    if curl -f -s http://localhost:3000 > /dev/null; then
        log_success "Frontend accessibility test passed"
    else
        log_warning "Frontend accessibility test failed (may be expected if using external frontend)"
    fi
    
    log_success "Smoke tests completed"
}

cleanup_old_images() {
    log_info "Cleaning up old Docker images..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove old versions of our images (keep latest 3)
    for image in interview-coach-api interview-coach-ws interview-coach-frontend; do
        if docker images --format "table {{.Repository}}" | grep -q "$image"; then
            docker images --format "table {{.Repository}}:{{.Tag}} {{.ID}}" | \
                grep "$image" | \
                tail -n +4 | \
                awk '{print $2}' | \
                xargs -r docker rmi
        fi
    done
    
    log_success "Cleanup completed"
}

show_status() {
    log_info "Deployment status:"
    echo
    
    # Show running containers
    docker ps --filter "name=interview-coach" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo
    
    # Show service URLs
    echo "Service URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  API: http://localhost:8000"
    echo "  API Docs: http://localhost:8000/docs"
    echo "  WebSocket: ws://localhost:8001"
    echo "  Prometheus: http://localhost:9090"
    echo "  Grafana: http://localhost:3001 (admin/admin)"
    echo
    
    # Show logs command
    echo "To view logs: docker-compose -f $COMPOSE_FILE logs -f [service_name]"
    echo "To stop all services: docker-compose -f $COMPOSE_FILE down"
}

rollback() {
    log_warning "Rolling back deployment..."
    
    if [[ -z "${1:-}" ]]; then
        log_error "Please provide backup directory for rollback"
        exit 1
    fi
    
    local backup_dir="$1"
    
    if [[ ! -d "$backup_dir" ]]; then
        log_error "Backup directory $backup_dir not found"
        exit 1
    fi
    
    # Stop current services
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi
    
    $COMPOSE_CMD -f "$COMPOSE_FILE" down
    
    # Restore configuration
    cp "$backup_dir/$ENV_FILE" ./
    cp "$backup_dir/$COMPOSE_FILE" ./
    
    # Restore Redis data if backup exists
    if [[ -f "$backup_dir/redis_backup.rdb" ]]; then
        log_info "Restoring Redis data..."
        # Start only Redis to restore data
        $COMPOSE_CMD -f "$COMPOSE_FILE" up -d redis
        sleep 10
        docker cp "$backup_dir/redis_backup.rdb" interview-coach-redis:/data/dump.rdb
        docker restart interview-coach-redis
    fi
    
    # Start services
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    log_success "Rollback completed"
}

# Main deployment function
main() {
    local command="${1:-deploy}"
    
    case "$command" in
        "deploy")
            log_info "Starting production deployment..."
            check_prerequisites
            backup_data
            pull_latest_images
            deploy_services
            wait_for_health
            run_smoke_tests
            cleanup_old_images
            show_status
            log_success "Deployment completed successfully!"
            ;;
        "rollback")
            rollback "${2:-}"
            ;;
        "status")
            show_status
            ;;
        "backup")
            check_prerequisites
            backup_data
            ;;
        "health")
            wait_for_health
            run_smoke_tests
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|status|backup|health}"
            echo "  deploy   - Full production deployment"
            echo "  rollback - Rollback to previous backup (requires backup directory)"
            echo "  status   - Show current deployment status"
            echo "  backup   - Create backup of current deployment"
            echo "  health   - Run health checks"
            exit 1
            ;;
    esac
}

# Trap for cleanup on script interruption
trap 'log_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"
