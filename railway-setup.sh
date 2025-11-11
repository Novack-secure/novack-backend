#!/bin/bash

# ============================================
# Railway Setup Script for Novack Backend
# ============================================
# This script helps you set up and deploy the Novack backend to Railway

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_header() {
    echo ""
    echo "======================================"
    echo "$1"
    echo "======================================"
    echo ""
}

# Check if Railway CLI is installed
check_railway_cli() {
    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI is not installed"
        echo ""
        echo "Install it with one of these methods:"
        echo "  - Homebrew (macOS): brew install railway"
        echo "  - npm: npm i -g @railway/cli"
        echo "  - curl: curl -fsSL https://railway.app/install.sh | sh"
        echo ""
        exit 1
    fi
    print_success "Railway CLI is installed ($(railway --version))"
}

# Check if logged in
check_railway_auth() {
    if ! railway whoami &> /dev/null; then
        print_error "Not logged in to Railway"
        print_info "Running 'railway login'..."
        railway login
    else
        print_success "Logged in to Railway as $(railway whoami)"
    fi
}

# Main menu
show_menu() {
    print_header "NOVACK BACKEND - RAILWAY DEPLOYMENT"
    echo "1) Setup new Railway project"
    echo "2) Link to existing Railway project"
    echo "3) Add PostgreSQL database"
    echo "4) Add Redis database"
    echo "5) Configure environment variables"
    echo "6) Deploy to Railway"
    echo "7) View logs"
    echo "8) View status"
    echo "9) Run database seeds"
    echo "10) Open Railway dashboard"
    echo "11) Test deployment (health check)"
    echo "0) Exit"
    echo ""
    read -p "Select an option: " choice
}

# Setup new project
setup_new_project() {
    print_header "SETUP NEW RAILWAY PROJECT"
    read -p "Enter project name (default: novack-backend): " project_name
    project_name=${project_name:-novack-backend}

    print_info "Creating Railway project: $project_name"
    railway init --name "$project_name"
    print_success "Project created successfully"
}

# Link to existing project
link_existing_project() {
    print_header "LINK TO EXISTING PROJECT"
    railway link
    print_success "Linked to project"
}

# Add PostgreSQL
add_postgresql() {
    print_header "ADD POSTGRESQL DATABASE"
    print_info "Adding PostgreSQL service..."
    railway add --plugin postgresql
    print_success "PostgreSQL added"

    print_info "Setting up database variables..."
    railway variables set DB_HOST='${{Postgres.PGHOST}}'
    railway variables set DB_PORT='${{Postgres.PGPORT}}'
    railway variables set DB_USERNAME='${{Postgres.PGUSER}}'
    railway variables set DB_PASSWORD='${{Postgres.PGPASSWORD}}'
    railway variables set DB_NAME='${{Postgres.PGDATABASE}}'
    print_success "Database variables configured"
}

# Add Redis
add_redis() {
    print_header "ADD REDIS DATABASE"
    print_info "Adding Redis service..."
    railway add --plugin redis
    print_success "Redis added"

    print_info "Setting up Redis variables..."
    railway variables set REDIS_HOST='${{Redis.REDIS_HOST}}'
    railway variables set REDIS_PORT='${{Redis.REDIS_PORT}}'
    railway variables set REDIS_PASSWORD='${{Redis.REDIS_PASSWORD}}'
    railway variables set REDIS_USERNAME='default'
    railway variables set REDIS_URL='${{Redis.REDIS_URL}}'
    print_success "Redis variables configured"
}

# Configure environment variables
configure_env_vars() {
    print_header "CONFIGURE ENVIRONMENT VARIABLES"

    echo "This will set up essential environment variables."
    echo "You can skip any by pressing Enter."
    echo ""

    # JWT
    read -p "JWT_SECRET (required): " jwt_secret
    if [ ! -z "$jwt_secret" ]; then
        railway variables set JWT_SECRET="$jwt_secret"
    fi

    read -p "JWT_EXPIRATION (default: 24h): " jwt_exp
    jwt_exp=${jwt_exp:-24h}
    railway variables set JWT_EXPIRATION="$jwt_exp"

    # Frontend URL
    read -p "FRONTEND_URL (e.g., https://yourapp.vercel.app): " frontend_url
    if [ ! -z "$frontend_url" ]; then
        railway variables set FRONTEND_URL="$frontend_url"
    fi

    # AWS
    read -p "AWS_ACCESS_KEY_ID: " aws_key
    if [ ! -z "$aws_key" ]; then
        railway variables set AWS_ACCESS_KEY_ID="$aws_key"
    fi

    read -p "AWS_SECRET_ACCESS_KEY: " aws_secret
    if [ ! -z "$aws_secret" ]; then
        railway variables set AWS_SECRET_ACCESS_KEY="$aws_secret"
    fi

    read -p "AWS_REGION (default: us-east-2): " aws_region
    aws_region=${aws_region:-us-east-2}
    railway variables set AWS_REGION="$aws_region"

    # S3 Buckets
    read -p "AWS_S3_EMPLOYEE_BUCKET_NAME: " emp_bucket
    if [ ! -z "$emp_bucket" ]; then
        railway variables set AWS_S3_EMPLOYEE_BUCKET_NAME="$emp_bucket"
    fi

    read -p "AWS_S3_SUPPLIER_BUCKET_NAME: " sup_bucket
    if [ ! -z "$sup_bucket" ]; then
        railway variables set AWS_S3_SUPPLIER_BUCKET_NAME="$sup_bucket"
    fi

    read -p "AWS_S3_VISITOR_BUCKET_NAME: " vis_bucket
    if [ ! -z "$vis_bucket" ]; then
        railway variables set AWS_S3_VISITOR_BUCKET_NAME="$vis_bucket"
    fi

    # Email
    read -p "RESEND_API_KEY: " resend_key
    if [ ! -z "$resend_key" ]; then
        railway variables set RESEND_API_KEY="$resend_key"
    fi

    read -p "EMAIL_FROM_SECURITY (default: security@spcedes.com): " email_from
    email_from=${email_from:-security@spcedes.com}
    railway variables set EMAIL_FROM_SECURITY="$email_from"

    # DeepSeek
    read -p "DEEPSEEK_API_KEY: " deepseek_key
    if [ ! -z "$deepseek_key" ]; then
        railway variables set DEEPSEEK_API_KEY="$deepseek_key"
        railway variables set DEEPSEEK_API_URL="https://api.deepseek.com"
        railway variables set DEEPSEEK_BASE_URL="https://api.deepseek.com"
    fi

    # Other secrets
    read -p "ESP32_AUTH_KEY: " esp32_key
    if [ ! -z "$esp32_key" ]; then
        railway variables set ESP32_AUTH_KEY="$esp32_key"
    fi

    read -p "COOKIE_SECRET: " cookie_secret
    if [ ! -z "$cookie_secret" ]; then
        railway variables set COOKIE_SECRET="$cookie_secret"
    fi

    read -p "REDIS_ENCRYPTION_KEY: " redis_enc_key
    if [ ! -z "$redis_enc_key" ]; then
        railway variables set REDIS_ENCRYPTION_KEY="$redis_enc_key"
    fi

    # App settings
    railway variables set NODE_ENV="production"
    railway variables set LOG_LEVEL="info"
    railway variables set LOG_TO_FILE="true"
    railway variables set ELK_ENABLED="false"
    railway variables set APP_NAME="novack-backend"

    print_success "Environment variables configured"
}

# Deploy
deploy() {
    print_header "DEPLOY TO RAILWAY"
    print_info "Starting deployment..."
    railway up --detach
    print_success "Deployment started"
    print_info "View logs with option 7 or run: railway logs"
}

# View logs
view_logs() {
    print_header "VIEWING LOGS"
    railway logs
}

# View status
view_status() {
    print_header "PROJECT STATUS"
    railway status
    echo ""
    railway variables
}

# Run seeds
run_seeds() {
    print_header "RUN DATABASE SEEDS"
    print_info "Running seed script..."
    railway run npm run seed
    print_success "Seeds completed"
}

# Open dashboard
open_dashboard() {
    print_header "OPENING RAILWAY DASHBOARD"
    railway open
}

# Test deployment
test_deployment() {
    print_header "TEST DEPLOYMENT"
    echo "Enter your Railway URL (e.g., https://novack-backend-production.up.railway.app)"
    read -p "URL: " railway_url

    if [ ! -z "$railway_url" ]; then
        print_info "Testing health check endpoint..."
        if curl -f "$railway_url/health" > /dev/null 2>&1; then
            print_success "Health check passed! Backend is running correctly."
        else
            print_error "Health check failed. Check logs for details."
        fi
    fi
}

# Main script
main() {
    print_header "NOVACK BACKEND - RAILWAY SETUP"

    # Check prerequisites
    check_railway_cli
    check_railway_auth

    # Main loop
    while true; do
        show_menu

        case $choice in
            1) setup_new_project ;;
            2) link_existing_project ;;
            3) add_postgresql ;;
            4) add_redis ;;
            5) configure_env_vars ;;
            6) deploy ;;
            7) view_logs ;;
            8) view_status ;;
            9) run_seeds ;;
            10) open_dashboard ;;
            11) test_deployment ;;
            0)
                print_success "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option"
                ;;
        esac

        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main
main
