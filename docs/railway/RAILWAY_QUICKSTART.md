# 🚀 Railway Quick Start

Guía rápida para desplegar el backend en Railway en menos de 5 minutos.

## Prerequisitos

1. Instalar Railway CLI:
```bash
# macOS
brew install railway

# npm
npm i -g @railway/cli
```

2. Login en Railway:
```bash
railway login
```

## Despliegue Rápido (Opción 1: Script Automático)

Usa el script helper interactivo:

```bash
cd backend
./railway-setup.sh
```

El script te guiará paso a paso:
1. Crear/enlazar proyecto
2. Agregar PostgreSQL y Redis
3. Configurar variables de entorno
4. Desplegar

## Despliegue Manual (Opción 2: Comandos CLI)

### 1. Enlazar Proyecto
```bash
cd backend
railway link
# Selecciona "novack" de la lista
```

### 2. Agregar Servicios
```bash
# PostgreSQL
railway add --plugin postgresql

# Redis
railway add --plugin redis
```

### 3. Configurar Variables de BD
```bash
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
```

### 4. Configurar Variables Requeridas

**MÍNIMO REQUERIDO:**
```bash
railway variables set JWT_SECRET="tu_jwt_secret_super_seguro_aqui"
railway variables set FRONTEND_URL="https://tu-frontend.vercel.app"
railway variables set NODE_ENV="production"
```

**SERVICIOS AWS (Requerido para S3):**
```bash
railway variables set AWS_ACCESS_KEY_ID="tu_aws_key"
railway variables set AWS_SECRET_ACCESS_KEY="tu_aws_secret"
railway variables set AWS_REGION="us-east-2"
railway variables set AWS_S3_EMPLOYEE_BUCKET_NAME="novack-employees-s3"
railway variables set AWS_S3_SUPPLIER_BUCKET_NAME="novack-suppliers-s3"
railway variables set AWS_S3_VISITOR_BUCKET_NAME="novack-visitors-s3"
```

**EMAIL (Requerido para notificaciones):**
```bash
railway variables set RESEND_API_KEY="tu_resend_key"
railway variables set EMAIL_FROM_SECURITY="security@tudominio.com"
```

**OTROS SERVICIOS:**
```bash
railway variables set DEEPSEEK_API_KEY="tu_deepseek_key"
railway variables set DEEPSEEK_API_URL="https://api.deepseek.com"
railway variables set DEEPSEEK_BASE_URL="https://api.deepseek.com"
railway variables set ESP32_AUTH_KEY="tu_esp32_key"
railway variables set COOKIE_SECRET="tu_cookie_secret"
railway variables set REDIS_ENCRYPTION_KEY="tu_encryption_key"
```

### 5. Desplegar
```bash
railway up
```

### 6. Ver la URL
```bash
railway open
# O
railway status
```

## Verificar Despliegue

```bash
# Ver logs
railway logs

# Probar health check
curl https://tu-url.railway.app/health

# Debería responder: {"status":"ok","timestamp":"..."}
```

## Ejecutar Seeds (Opcional)

```bash
railway run npm run seed
```

## Comandos Útiles

```bash
# Ver todas las variables
railway variables

# Ver estado
railway status

# Redeploy
railway up

# Logs en vivo
railway logs

# Conectar a PostgreSQL
railway connect postgres

# Abrir dashboard
railway open
```

## Troubleshooting

**Build falla:**
```bash
railway logs --build
```

**App no inicia:**
```bash
railway logs
railway variables  # Verificar variables
```

**DB no conecta:**
```bash
railway variables | grep DB_
railway connect postgres  # Probar conexión directa
```

## Checklist Pre-Despliegue

- [ ] Railway CLI instalado
- [ ] Autenticado (`railway login`)
- [ ] Variables de entorno listas
- [ ] AWS S3 buckets creados
- [ ] Resend API key obtenida
- [ ] Frontend URL conocida

## Siguiente Paso

Después del despliegue, actualiza tu frontend con la URL del backend:

```env
# En tu frontend/.env.production
NEXT_PUBLIC_API_URL=https://tu-backend.railway.app
```

---

📖 **Para más detalles**, lee `RAILWAY_DEPLOYMENT.md`

🐛 **¿Problemas?** Revisa los logs: `railway logs`
