# 📦 Resumen de Configuración para Railway

## ✅ Archivos Creados

Todos los archivos necesarios para el despliegue en Railway han sido configurados:

### Configuración Docker
- ✅ `Dockerfile` - Multi-stage build optimizado para producción
- ✅ `.dockerignore` - Optimiza el build excluyendo archivos innecesarios
- ✅ `docker-compose.yml` - Ya existía, configurado para desarrollo local con ELK

### Configuración Railway
- ✅ `railway.json` - Configuración del build y despliegue
- ✅ `.env.example` - Template de variables de entorno

### Documentación
- ✅ `RAILWAY_DEPLOYMENT.md` - Guía completa paso a paso
- ✅ `RAILWAY_QUICKSTART.md` - Guía rápida de 5 minutos
- ✅ `DEPLOYMENT_SUMMARY.md` - Este archivo

### Scripts de Ayuda
- ✅ `railway-setup.sh` - Script interactivo completo
- ✅ `railway-deploy-now.sh` - Script rápido para proyecto existente

## 🚀 Próximos Pasos

### Opción 1: Despliegue Rápido con Script (Recomendado)

```bash
cd backend
./railway-deploy-now.sh
```

Este script:
1. Te conecta al proyecto Railway existente (novack)
2. Te permite configurar variables de entorno
3. Despliega automáticamente

### Opción 2: Despliegue Manual

#### 1. Instalar Railway CLI (si no lo tienes)
```bash
# macOS
brew install railway

# npm
npm i -g @railway/cli
```

#### 2. Login y conectar al proyecto
```bash
cd backend
railway login
railway link
# Selecciona "novack" de la lista que aparece
```

#### 3. Agregar servicios desde la UI de Railway
Ve a [railway.app/project/dceb2b2c-c496-48f9-8539-7eb8e5b33ba9](https://railway.app/project/dceb2b2c-c496-48f9-8539-7eb8e5b33ba9):

- Click "New Service" → "Database" → "PostgreSQL"
- Click "New Service" → "Database" → "Redis"

#### 4. Configurar variables de base de datos
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

#### 5. Configurar variables de aplicación

**CRÍTICAS (requeridas):**
```bash
railway variables set JWT_SECRET="tu_jwt_secret_super_seguro"
railway variables set FRONTEND_URL="https://tu-frontend.vercel.app"
railway variables set NODE_ENV="production"
```

**AWS S3 (requeridas para uploads):**
```bash
railway variables set AWS_ACCESS_KEY_ID="AKIA..."
railway variables set AWS_SECRET_ACCESS_KEY="tu_secret"
railway variables set AWS_REGION="us-east-2"
railway variables set AWS_S3_EMPLOYEE_BUCKET_NAME="novack-employees-s3"
railway variables set AWS_S3_SUPPLIER_BUCKET_NAME="novack-suppliers-s3"
railway variables set AWS_S3_VISITOR_BUCKET_NAME="novack-visitors-s3"
```

**Email (requerido para notificaciones):**
```bash
railway variables set RESEND_API_KEY="re_..."
railway variables set EMAIL_FROM_SECURITY="security@spcedes.com"
```

**Opcionales pero recomendadas:**
```bash
railway variables set DEEPSEEK_API_KEY="sk-..."
railway variables set DEEPSEEK_API_URL="https://api.deepseek.com"
railway variables set DEEPSEEK_BASE_URL="https://api.deepseek.com"
railway variables set ESP32_AUTH_KEY="tu_esp32_key"
railway variables set COOKIE_SECRET="tu_cookie_secret"
railway variables set REDIS_ENCRYPTION_KEY="tu_encryption_key"
railway variables set LOG_LEVEL="info"
railway variables set LOG_TO_FILE="true"
railway variables set ELK_ENABLED="false"
railway variables set APP_NAME="novack-backend"
```

#### 6. Desplegar
```bash
railway up
```

#### 7. Verificar
```bash
# Ver logs
railway logs

# Ver estado y URL
railway status

# Probar health check
curl https://tu-url.railway.app/health
```

## 📝 Variables de Entorno Requeridas

### Base de Datos (Auto-configuradas por Railway)
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_URL`

### Aplicación
| Variable | Descripción | Ejemplo | ¿Crítica? |
|----------|-------------|---------|-----------|
| `JWT_SECRET` | Secret para tokens JWT | `UtahD6c3jgBk...` | ✅ Sí |
| `JWT_EXPIRATION` | Expiración de tokens | `24h` | No |
| `NODE_ENV` | Ambiente | `production` | ✅ Sí |
| `FRONTEND_URL` | URL del frontend | `https://app.com` | ✅ Sí |
| `PORT` | Puerto (auto por Railway) | `4000` | Auto |

### AWS
| Variable | Descripción | ¿Crítica? |
|----------|-------------|-----------|
| `AWS_ACCESS_KEY_ID` | AWS Key ID | ✅ Sí |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret | ✅ Sí |
| `AWS_REGION` | Región AWS | ✅ Sí |
| `AWS_S3_EMPLOYEE_BUCKET_NAME` | Bucket empleados | ✅ Sí |
| `AWS_S3_SUPPLIER_BUCKET_NAME` | Bucket proveedores | ✅ Sí |
| `AWS_S3_VISITOR_BUCKET_NAME` | Bucket visitantes | ✅ Sí |

### Email
| Variable | Descripción | ¿Crítica? |
|----------|-------------|-----------|
| `RESEND_API_KEY` | API key de Resend | ✅ Sí |
| `EMAIL_FROM_SECURITY` | Email remitente | No |

### Opcionales
| Variable | Descripción | Default |
|----------|-------------|---------|
| `DEEPSEEK_API_KEY` | API de DeepSeek | - |
| `DEEPSEEK_API_URL` | URL de DeepSeek | `https://api.deepseek.com` |
| `ESP32_AUTH_KEY` | Key para ESP32 | - |
| `COOKIE_SECRET` | Secret de cookies | - |
| `REDIS_ENCRYPTION_KEY` | Encriptación Redis | - |
| `LOG_LEVEL` | Nivel de logs | `info` |
| `LOG_TO_FILE` | Guardar logs | `true` |
| `ELK_ENABLED` | Habilitar ELK | `false` |
| `APP_NAME` | Nombre app | `novack-backend` |

## 🔍 Verificación Post-Despliegue

### 1. Health Check
```bash
curl https://tu-url.railway.app/health

# Respuesta esperada:
# {"status":"ok","timestamp":"..."}
```

### 2. Ver Logs
```bash
railway logs
```

Busca:
- ✅ "Application is running on: http://[::]:PORT"
- ✅ "Connected to database"
- ✅ "Redis connected"
- ❌ Errores de conexión
- ❌ Errores de variables faltantes

### 3. Ejecutar Seeds (Primera vez)
```bash
railway run npm run seed
```

### 4. Probar Endpoints
```bash
# Login (después de seeds)
curl -X POST https://tu-url.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"roberto.fernandez@securenet.cr","password":"SecureNet2024!"}'
```

## 🎯 Información del Proyecto Railway

- **Nombre**: novack
- **Project ID**: `dceb2b2c-c496-48f9-8539-7eb8e5b33ba9`
- **Dashboard**: https://railway.app/project/dceb2b2c-c496-48f9-8539-7eb8e5b33ba9

## 📚 Recursos y Comandos Útiles

### Comandos Railway
```bash
# Ver todas las variables
railway variables

# Ver estado y URL
railway status

# Logs en tiempo real
railway logs

# Redeploy
railway up

# Conectar a PostgreSQL
railway connect postgres

# Ejecutar comando
railway run <comando>

# Abrir dashboard
railway open
```

### Troubleshooting
```bash
# Build falla
railway logs --build

# Ver todas las variables configuradas
railway variables

# Probar BD localmente
railway connect postgres
```

## 🚦 Estados del Deployment

| Estado | Descripción |
|--------|-------------|
| 🟡 Building | Construyendo imagen Docker |
| 🟡 Deploying | Desplegando contenedor |
| 🟢 Active | Deployment exitoso y corriendo |
| 🔴 Failed | Falló - revisar logs |
| 🟠 Crashed | Se cayó después de iniciar |

## 📊 Próximos Pasos Después del Despliegue

1. **Copiar la URL del backend** de Railway
2. **Actualizar el frontend** con la nueva URL:
   ```env
   # frontend/.env.production
   NEXT_PUBLIC_API_URL=https://tu-backend.railway.app
   ```
3. **Configurar CORS** si es necesario (ya debería estar configurado con FRONTEND_URL)
4. **Ejecutar seeds** si es la primera vez
5. **Probar la integración** frontend-backend

## ⚠️ Notas Importantes

1. **ELK Stack**: Está deshabilitado por defecto en producción (`ELK_ENABLED=false`) para reducir costos y complejidad
2. **Logs**: Railway mantiene logs por 7 días
3. **Backups**: Railway hace backups automáticos de PostgreSQL
4. **Escalado**: Railway auto-escala basado en uso
5. **Costos**: Monitorea el uso en el dashboard para evitar sorpresas

## 🎉 ¡Listo!

Tu backend debería estar corriendo en Railway. Accede al dashboard para:
- Ver métricas de CPU/RAM
- Configurar variables adicionales
- Ver logs históricos
- Configurar dominios personalizados

**Dashboard del proyecto**: https://railway.app/project/dceb2b2c-c496-48f9-8539-7eb8e5b33ba9

---

**¿Problemas?** Consulta `RAILWAY_DEPLOYMENT.md` para troubleshooting detallado.
