#!/bin/bash

# ============================================
# Quick Railway Deployment for Existing Project
# Project: novack
# Project ID: dceb2b2c-c496-48f9-8539-7eb8e5b33ba9
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔════════════════════════════════════════╗"
echo "║   NOVACK BACKEND - RAILWAY DEPLOY     ║"
echo "╔════════════════════════════════════════╗"
echo -e "${NC}"

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${RED}✗ Railway CLI no está instalado${NC}"
    echo ""
    echo "Instálalo con:"
    echo "  brew install railway    # macOS"
    echo "  npm i -g @railway/cli   # npm"
    exit 1
fi

echo -e "${GREEN}✓ Railway CLI detectado${NC}"

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}→ Iniciando login...${NC}"
    railway login
fi

echo -e "${GREEN}✓ Autenticado como: $(railway whoami)${NC}"
echo ""

# Check if already linked to a project
if railway status &> /dev/null; then
    echo -e "${GREEN}✓ Ya estás enlazado a un proyecto Railway${NC}"
    echo -e "${YELLOW}Proyecto actual: $(railway status 2>/dev/null | grep -i "project" || echo "novack")${NC}"
else
    echo -e "${YELLOW}→ Enlazando al proyecto 'novack'...${NC}"
    echo -e "${YELLOW}ℹ  Selecciona el proyecto 'novack' de la lista${NC}"
    railway link
    echo -e "${GREEN}✓ Proyecto enlazado${NC}"
fi
echo ""

# Show menu
echo "¿Qué deseas hacer?"
echo ""
echo "1) Configurar SOLO las variables de base de datos (PostgreSQL + Redis)"
echo "2) Configurar TODAS las variables de entorno"
echo "3) Desplegar ahora (usar variables existentes)"
echo "4) Ver variables actuales"
echo "5) Ver logs"
echo "6) Ejecutar seeds"
echo ""
read -p "Selecciona una opción (1-6): " option

case $option in
    1)
        echo ""
        echo -e "${YELLOW}→ Configurando variables de base de datos...${NC}"

        # PostgreSQL
        railway variables set DB_HOST='${{Postgres.PGHOST}}'
        railway variables set DB_PORT='${{Postgres.PGPORT}}'
        railway variables set DB_USERNAME='${{Postgres.PGUSER}}'
        railway variables set DB_PASSWORD='${{Postgres.PGPASSWORD}}'
        railway variables set DB_NAME='${{Postgres.PGDATABASE}}'

        # Redis
        railway variables set REDIS_HOST='${{Redis.REDIS_HOST}}'
        railway variables set REDIS_PORT='${{Redis.REDIS_PORT}}'
        railway variables set REDIS_PASSWORD='${{Redis.REDIS_PASSWORD}}'
        railway variables set REDIS_USERNAME='default'
        railway variables set REDIS_URL='${{Redis.REDIS_URL}}'

        echo -e "${GREEN}✓ Variables de BD configuradas${NC}"
        ;;

    2)
        echo ""
        echo -e "${YELLOW}→ Configurando todas las variables...${NC}"
        echo "Presiona Enter para usar valores por defecto o ingresa tu valor"
        echo ""

        # Database variables
        railway variables set DB_HOST='${{Postgres.PGHOST}}'
        railway variables set DB_PORT='${{Postgres.PGPORT}}'
        railway variables set DB_USERNAME='${{Postgres.PGUSER}}'
        railway variables set DB_PASSWORD='${{Postgres.PGPASSWORD}}'
        railway variables set DB_NAME='${{Postgres.PGDATABASE}}'
        railway variables set REDIS_HOST='${{Redis.REDIS_HOST}}'
        railway variables set REDIS_PORT='${{Redis.REDIS_PORT}}'
        railway variables set REDIS_PASSWORD='${{Redis.REDIS_PASSWORD}}'
        railway variables set REDIS_USERNAME='default'
        railway variables set REDIS_URL='${{Redis.REDIS_URL}}'

        # JWT
        read -p "JWT_SECRET: " jwt_secret
        if [ ! -z "$jwt_secret" ]; then
            railway variables set JWT_SECRET="$jwt_secret"
        fi

        railway variables set JWT_EXPIRATION="24h"

        # App
        read -p "FRONTEND_URL (ej: https://app.tudominio.com): " frontend_url
        if [ ! -z "$frontend_url" ]; then
            railway variables set FRONTEND_URL="$frontend_url"
        fi

        railway variables set NODE_ENV="production"

        # AWS
        read -p "AWS_ACCESS_KEY_ID: " aws_key
        if [ ! -z "$aws_key" ]; then
            railway variables set AWS_ACCESS_KEY_ID="$aws_key"
        fi

        read -p "AWS_SECRET_ACCESS_KEY: " aws_secret
        if [ ! -z "$aws_secret" ]; then
            railway variables set AWS_SECRET_ACCESS_KEY="$aws_secret"
        fi

        railway variables set AWS_REGION="us-east-2"

        read -p "AWS_S3_EMPLOYEE_BUCKET_NAME (default: novack-employees-s3): " emp_bucket
        emp_bucket=${emp_bucket:-novack-employees-s3}
        railway variables set AWS_S3_EMPLOYEE_BUCKET_NAME="$emp_bucket"

        read -p "AWS_S3_SUPPLIER_BUCKET_NAME (default: novack-suppliers-s3): " sup_bucket
        sup_bucket=${sup_bucket:-novack-suppliers-s3}
        railway variables set AWS_S3_SUPPLIER_BUCKET_NAME="$sup_bucket"

        read -p "AWS_S3_VISITOR_BUCKET_NAME (default: novack-visitors-s3): " vis_bucket
        vis_bucket=${vis_bucket:-novack-visitors-s3}
        railway variables set AWS_S3_VISITOR_BUCKET_NAME="$vis_bucket"

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

        # Secrets
        read -p "ESP32_AUTH_KEY: " esp32_key
        if [ ! -z "$esp32_key" ]; then
            railway variables set ESP32_AUTH_KEY="$esp32_key"
        fi

        read -p "COOKIE_SECRET: " cookie_secret
        if [ ! -z "$cookie_secret" ]; then
            railway variables set COOKIE_SECRET="$cookie_secret"
        fi

        read -p "REDIS_ENCRYPTION_KEY: " redis_key
        if [ ! -z "$redis_key" ]; then
            railway variables set REDIS_ENCRYPTION_KEY="$redis_key"
        fi

        # Logging
        railway variables set LOG_LEVEL="info"
        railway variables set LOG_TO_FILE="true"
        railway variables set ELK_ENABLED="false"
        railway variables set APP_NAME="novack-backend"

        echo -e "${GREEN}✓ Todas las variables configuradas${NC}"
        ;;

    3)
        echo ""
        echo -e "${YELLOW}→ Iniciando despliegue...${NC}"
        railway up --detach
        echo ""
        echo -e "${GREEN}✓ Despliegue iniciado${NC}"
        echo ""
        echo "Ver progreso con: railway logs"
        echo "Ver URL con: railway status"
        ;;

    4)
        echo ""
        echo -e "${YELLOW}→ Variables actuales:${NC}"
        echo ""
        railway variables
        ;;

    5)
        echo ""
        echo -e "${YELLOW}→ Logs en vivo (Ctrl+C para salir):${NC}"
        echo ""
        railway logs
        ;;

    6)
        echo ""
        echo -e "${YELLOW}→ Ejecutando seeds...${NC}"
        railway run npm run seed
        echo -e "${GREEN}✓ Seeds completados${NC}"
        ;;

    *)
        echo -e "${RED}✗ Opción inválida${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ Operación completada${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "Comandos útiles:"
echo "  railway status   - Ver estado y URL"
echo "  railway logs     - Ver logs"
echo "  railway open     - Abrir dashboard"
echo ""
