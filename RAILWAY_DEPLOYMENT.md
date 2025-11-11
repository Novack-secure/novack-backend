# 🚂 Guía de Despliegue en Railway

Esta guía te ayudará a desplegar el backend de Novack en Railway usando el CLI.

## 📋 Requisitos Previos

1. **Cuenta en Railway**: Crea una cuenta en [railway.app](https://railway.app)
2. **Railway CLI**: Instala el CLI de Railway
3. **Git**: Asegúrate de tener Git instalado
4. **Código actualizado**: Tu código debe estar commiteado en Git

## 🔧 Instalación del Railway CLI

### macOS / Linux
```bash
# Usando Homebrew (macOS)
brew install railway

# O usando script de instalación
curl -fsSL https://railway.app/install.sh | sh

# O usando npm
npm i -g @railway/cli
```

### Windows
```powershell
# Usando npm
npm i -g @railway/cli
```

### Verificar instalación
```bash
railway --version
```

## 🚀 Pasos para el Despliegue

### 1. Autenticación en Railway

```bash
# Iniciar sesión en Railway
railway login
```

Esto abrirá tu navegador para autenticarte.

### 2. Crear un Nuevo Proyecto

#### Opción A: Desde el CLI (Recomendado)
```bash
# Navega al directorio del backend
cd backend

# Inicializar proyecto de Railway
railway init

# Esto te preguntará:
# - Nombre del proyecto (ej: novack-backend)
# - Si quieres crear un nuevo proyecto o usar uno existente
```

#### Opción B: Desde la Web UI
1. Ve a [railway.app/new](https://railway.app/new)
2. Crea un nuevo proyecto vacío
3. Luego en el CLI:
```bash
cd backend
railway link
```

### 3. Configurar Servicios de Base de Datos

Railway necesita servicios de PostgreSQL y Redis. Puedes crearlos desde la UI o CLI:

#### Desde la UI (Más fácil):
1. Ve a tu proyecto en railway.app
2. Click en "New Service" → "Database" → "PostgreSQL"
3. Click en "New Service" → "Database" → "Redis"

Los servicios se crearán automáticamente con sus variables de entorno.

#### Desde el CLI:
```bash
# Crear servicio de PostgreSQL
railway add --plugin postgresql

# Crear servicio de Redis
railway add --plugin redis
```

### 4. Configurar Variables de Entorno

Puedes configurar las variables de entorno de dos formas:

#### Opción A: Desde el CLI
```bash
# Configurar variables individuales
railway variables set JWT_SECRET="your_super_secret_jwt_key_here"
railway variables set NODE_ENV="production"
railway variables set FRONTEND_URL="https://your-frontend-url.com"
railway variables set AWS_ACCESS_KEY_ID="your_aws_key"
railway variables set AWS_SECRET_ACCESS_KEY="your_aws_secret"
railway variables set RESEND_API_KEY="your_resend_key"
railway variables set DEEPSEEK_API_KEY="your_deepseek_key"
railway variables set ESP32_AUTH_KEY="your_esp32_key"
railway variables set COOKIE_SECRET="your_cookie_secret"
railway variables set REDIS_ENCRYPTION_KEY="your_encryption_key"

# AWS S3 Buckets
railway variables set AWS_REGION="us-east-2"
railway variables set AWS_S3_EMPLOYEE_BUCKET_NAME="novack-employees-s3"
railway variables set AWS_S3_SUPPLIER_BUCKET_NAME="novack-suppliers-s3"
railway variables set AWS_S3_VISITOR_BUCKET_NAME="novack-visitors-s3"

# Email
railway variables set EMAIL_FROM_SECURITY="security@spcedes.com"

# Logging
railway variables set LOG_LEVEL="info"
railway variables set LOG_TO_FILE="true"
railway variables set ELK_ENABLED="false"
railway variables set APP_NAME="novack-backend"
```

#### Opción B: Desde la Web UI (Recomendado para muchas variables)
1. Ve a tu proyecto en railway.app
2. Selecciona tu servicio del backend
3. Ve a la pestaña "Variables"
4. Agrega todas las variables necesarias

**Variables automáticas de Railway:**
Railway automáticamente inyecta estas variables cuando agregas los servicios:
- `DATABASE_URL` (si agregaste PostgreSQL)
- `REDIS_URL` (si agregaste Redis)
- `PORT` (Railway lo asigna automáticamente)

**IMPORTANTE:** Necesitas mapear las variables de Railway a las que usa tu app:

```bash
# PostgreSQL - Railway usa DATABASE_URL, pero tu app usa variables individuales
# Opción 1: Usar DATABASE_URL directamente (requiere modificar código)
# Opción 2: Configurar variables individuales (recomendado):

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

### 5. Desplegar el Backend

```bash
# Asegúrate de estar en el directorio backend
cd backend

# Desplegar
railway up

# O si quieres forzar un rebuild
railway up --detach
```

Railway automáticamente:
1. Detectará el `Dockerfile`
2. Construirá la imagen Docker
3. Desplegará el contenedor
4. Asignará una URL pública

### 6. Ver el Despliegue

```bash
# Ver logs en tiempo real
railway logs

# Ver el estado del deployment
railway status

# Abrir el proyecto en el navegador
railway open
```

### 7. Ejecutar Seeds (Opcional)

Si necesitas ejecutar los scripts de seed en producción:

```bash
# Conectar a tu servicio y ejecutar comando
railway run npm run seed

# O entrar en una shell
railway shell
# Luego dentro del contenedor:
npm run seed
```

## 🔍 Verificación del Despliegue

### Verificar Health Check
```bash
# Railway te dará una URL, por ejemplo: https://novack-backend-production.up.railway.app
curl https://your-railway-url.railway.app/health
```

### Ver Variables de Entorno
```bash
railway variables
```

### Ver Logs
```bash
# Logs en vivo
railway logs

# Últimos 100 logs
railway logs --tail 100
```

## 🔧 Comandos Útiles de Railway

```bash
# Listar proyectos
railway list

# Cambiar de proyecto
railway link

# Ver información del proyecto actual
railway status

# Redeploy sin cambios de código
railway redeploy

# Abrir dashboard en el navegador
railway open

# Eliminar el proyecto (¡CUIDADO!)
railway delete

# Conectar con PostgreSQL
railway connect postgres

# Conectar con Redis
railway connect redis

# Ejecutar comando en el entorno de producción
railway run <comando>

# Abrir shell en el contenedor
railway shell
```

## 📊 Monitoreo y Debugging

### Ver métricas
1. Ve a tu proyecto en railway.app
2. Selecciona tu servicio
3. Ve a la pestaña "Metrics" para ver CPU, RAM, Network

### Ver deployments
```bash
railway deployments
```

### Rollback a un deployment anterior
1. Ve a railway.app
2. Selecciona tu servicio
3. Ve a "Deployments"
4. Click en los tres puntos del deployment deseado
5. Click en "Redeploy"

## 🔄 Actualizar el Despliegue

Cuando hagas cambios en tu código:

```bash
# 1. Commit tus cambios
git add .
git commit -m "Update backend"

# 2. Railway automáticamente detectará los cambios si tienes CI/CD configurado
# O puedes forzar un redeploy:
railway up
```

## 🌍 Variables de Entorno por Ambiente

Railway soporta múltiples ambientes (staging, production):

```bash
# Crear un nuevo ambiente
railway environment create staging

# Cambiar de ambiente
railway environment staging

# Configurar variables específicas del ambiente
railway variables set NODE_ENV=staging
```

## 📁 Estructura de Archivos para Railway

Tu backend debe tener estos archivos:

```
backend/
├── Dockerfile              # ✅ Creado - Configuración de Docker
├── .dockerignore          # ✅ Creado - Archivos a ignorar en build
├── railway.json           # ✅ Creado - Configuración de Railway
├── .env.example           # ✅ Creado - Template de variables
├── package.json           # ✅ Ya existente
├── pnpm-lock.yaml        # ✅ Ya existente
└── src/                   # Tu código fuente
```

## 🚨 Troubleshooting

### Build falla
```bash
# Ver logs detallados
railway logs --build

# Verificar que el Dockerfile esté correcto
cat Dockerfile

# Probar build localmente
docker build -t novack-backend .
```

### App no inicia
```bash
# Ver logs
railway logs

# Verificar health check
curl https://your-url.railway.app/health

# Verificar variables de entorno
railway variables
```

### Conexión a BD falla
```bash
# Verificar que PostgreSQL esté corriendo
railway status

# Verificar variables de conexión
railway variables | grep DB_

# Probar conexión directa
railway connect postgres
```

### Puerto incorrecto
Railway asigna el puerto automáticamente. Asegúrate de que tu app use `process.env.PORT`:

```typescript
// En tu main.ts
const port = process.env.PORT || 4000;
await app.listen(port);
```

## 💰 Costos y Límites

- **Free Tier**: $5 de crédito mensual
- **Developer Plan**: $20/mes con $20 de créditos incluidos
- **Team Plan**: $20/usuario/mes

Los recursos se cobran por uso:
- CPU: ~$0.000463/vCPU/min
- RAM: ~$0.000231/GB/min
- Egress: Primeros 100GB gratis

## 🎯 Mejores Prácticas

1. **Usa variables de entorno**: Nunca hagas commit de secretos
2. **Monitorea el uso**: Revisa las métricas regularmente
3. **Configura health checks**: Railway puede auto-reiniciar servicios caídos
4. **Usa múltiples ambientes**: Staging y Production
5. **Revisa los logs**: Railway mantiene logs por 7 días
6. **Backup de BD**: Railway hace backups, pero considera backups adicionales

## 📚 Recursos Adicionales

- [Railway Docs](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway)
- [Railway Templates](https://railway.app/templates)
- [Railway Status](https://status.railway.app/)

## ✅ Checklist de Despliegue

- [ ] Railway CLI instalado
- [ ] Autenticado en Railway
- [ ] Proyecto creado en Railway
- [ ] PostgreSQL agregado
- [ ] Redis agregado
- [ ] Variables de entorno configuradas
- [ ] Dockerfile optimizado
- [ ] .dockerignore configurado
- [ ] railway.json creado
- [ ] Código commiteado en Git
- [ ] Deploy ejecutado (`railway up`)
- [ ] Health check funcionando
- [ ] Logs verificados
- [ ] Seeds ejecutados (si es necesario)
- [ ] Frontend configurado con URL del backend

## 🎉 ¡Listo!

Tu backend de Novack debería estar corriendo en Railway. La URL será algo como:

```
https://novack-backend-production.up.railway.app
```

Recuerda actualizar la variable `NEXT_PUBLIC_API_URL` en tu frontend con esta URL.

---

**¿Problemas?** Revisa los logs con `railway logs` o contacta soporte en Discord.
