# 🚂 Despliegue en Railway - Inicio Rápido

## 🎯 Opción Más Rápida (1 comando)

```bash
./railway-deploy-now.sh
```

Este script:
- ✅ Verifica Railway CLI
- ✅ Te autentica si es necesario
- ✅ Conecta al proyecto `novack`
- ✅ Te permite configurar variables
- ✅ Despliega automáticamente

## 📋 Prerequisitos

```bash
# Instalar Railway CLI
brew install railway  # macOS
# O
npm i -g @railway/cli  # npm
```

## 🚀 Pasos Mínimos

### 1. Login
```bash
railway login
```

### 2. Enlazar proyecto
```bash
railway link
# Selecciona "novack" de la lista
```

### 3. Agregar servicios (desde la UI)
Ve a: https://railway.app/project/dceb2b2c-c496-48f9-8539-7eb8e5b33ba9

- Add → Database → PostgreSQL
- Add → Database → Redis

### 4. Variables mínimas requeridas
```bash
# Base de datos (auto-configuradas por Railway con los servicios)
railway variables set DB_HOST='${{Postgres.PGHOST}}'
railway variables set DB_PORT='${{Postgres.PGPORT}}'
railway variables set DB_USERNAME='${{Postgres.PGUSER}}'
railway variables set DB_PASSWORD='${{Postgres.PGPASSWORD}}'
railway variables set DB_NAME='${{Postgres.PGDATABASE}}'
railway variables set REDIS_HOST='${{Redis.REDIS_HOST}}'
railway variables set REDIS_PORT='${{Redis.REDIS_PORT}}'
railway variables set REDIS_PASSWORD='${{Redis.REDIS_PASSWORD}}'
railway variables set REDIS_URL='${{Redis.REDIS_URL}}'

# Aplicación (REEMPLAZA CON TUS VALORES)
railway variables set JWT_SECRET="TU_JWT_SECRET_AQUI"
railway variables set FRONTEND_URL="https://tu-frontend.vercel.app"
railway variables set NODE_ENV="production"
railway variables set AWS_ACCESS_KEY_ID="TU_AWS_KEY"
railway variables set AWS_SECRET_ACCESS_KEY="TU_AWS_SECRET"
railway variables set AWS_REGION="us-east-2"
railway variables set AWS_S3_EMPLOYEE_BUCKET_NAME="novack-employees-s3"
railway variables set AWS_S3_SUPPLIER_BUCKET_NAME="novack-suppliers-s3"
railway variables set AWS_S3_VISITOR_BUCKET_NAME="novack-visitors-s3"
railway variables set RESEND_API_KEY="TU_RESEND_KEY"
```

### 5. Desplegar
```bash
railway up
```

### 6. Ver URL y logs
```bash
railway status
railway logs
```

## ✅ Verificar

```bash
# Health check
curl https://tu-url.railway.app/health

# Debe responder: {"status":"ok",...}
```

## 📚 Documentación Completa

- **Guía completa**: `RAILWAY_DEPLOYMENT.md`
- **Guía rápida**: `RAILWAY_QUICKSTART.md`
- **Resumen**: `DEPLOYMENT_SUMMARY.md`

## 🔧 Comandos Útiles

```bash
railway logs          # Ver logs
railway status        # Ver estado
railway open          # Abrir dashboard
railway variables     # Ver variables
railway run npm run seed  # Ejecutar seeds
```

## 🆘 Ayuda

**¿Build falla?**
```bash
railway logs --build
```

**¿App no inicia?**
```bash
railway logs
railway variables  # Verificar variables
```

**¿BD no conecta?**
```bash
railway variables | grep DB_
```

---

**Dashboard**: https://railway.app/project/dceb2b2c-c496-48f9-8539-7eb8e5b33ba9
