# 🚀 Instrucciones Finales de Despliegue

## ✅ Lo que Ya Está Listo

1. ✅ **Railway CLI** configurado y autenticado
2. ✅ **Proyecto "novack"** enlazado en Railway
3. ✅ **PostgreSQL** funcionando (problema de collation arreglado)
4. ✅ **Redis** funcionando
5. ✅ **Variables de entorno** configuradas
6. ✅ **Código en rama main** con toda la configuración de Railway
7. ✅ **Dockerfile** multi-stage optimizado
8. ✅ **railway.json** configurado

## 📝 Pasos Finales (Solo 2 pasos)

### Paso 1: Push a GitHub

Necesitas hacer push de la rama `main` a GitHub. Tienes dos opciones:

#### Opción A: Configurar SSH (Recomendado)

1. Genera una SSH key si no tienes una:
```bash
ssh-keygen -t ed25519 -C "spcedes@gmail.com"
```

2. Copia la key pública:
```bash
cat ~/.ssh/id_ed25519.pub
```

3. Agrégala a GitHub:
   - Ve a https://github.com/settings/keys
   - Click "New SSH key"
   - Pega la key y guarda

4. Haz push:
```bash
cd /Users/estebancanales/Work/novack/backend
git push origin main
```

#### Opción B: Usar HTTPS

1. Cambia el remote a HTTPS:
```bash
cd /Users/estebancanales/Work/novack/backend
git remote set-url origin https://github.com/TU_USUARIO/novack.git
```

2. Haz push (te pedirá usuario y token):
```bash
git push origin main
```

**Nota:** Si no tienes un Personal Access Token, créalo en:
https://github.com/settings/tokens

### Paso 2: Configurar Servicio Backend en Railway

1. **Abre tu proyecto en Railway:**
   
   🔗 https://railway.app/project/dceb2b2c-c496-48f9-8539-7eb8e5b33ba9

2. **Agregar Servicio del Backend:**
   - Click en **"+ New"** o **"New Service"**
   - Selecciona **"GitHub Repo"**
   - Busca y selecciona tu repositorio
   - **IMPORTANTE:** Selecciona la rama **`main`**
   - Railway detectará automáticamente el `Dockerfile` y `railway.json`

3. **Verificar Variables de Entorno:**
   
   Ve al nuevo servicio del backend → Tab "Variables" y verifica que tenga:

   **Variables de Base de Datos (Auto-configuradas):**
   ```
   DB_HOST=${{Postgres.PGHOST}}
   DB_PORT=${{Postgres.PGPORT}}
   DB_USERNAME=${{Postgres.PGUSER}}
   DB_PASSWORD=${{Postgres.PGPASSWORD}}
   DB_NAME=${{Postgres.PGDATABASE}}
   
   REDIS_HOST=${{Redis.REDIS_HOST}}
   REDIS_PORT=${{Redis.REDIS_PORT}}
   REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
   REDIS_URL=${{Redis.REDIS_URL}}
   ```

   **Variables que DEBES ACTUALIZAR con tus valores reales:**
   ```
   AWS_ACCESS_KEY_ID=TU_AWS_KEY_AQUI
   AWS_SECRET_ACCESS_KEY=TU_AWS_SECRET_AQUI
   RESEND_API_KEY=TU_RESEND_KEY_AQUI
   DEEPSEEK_API_KEY=TU_DEEPSEEK_KEY_AQUI (opcional)
   FRONTEND_URL=https://tu-frontend.vercel.app
   ```

   **Variables ya configuradas (revisar que existan):**
   ```
   NODE_ENV=production
   JWT_SECRET=(ya generado automáticamente)
   COOKIE_SECRET=(ya generado automáticamente)
   REDIS_ENCRYPTION_KEY=(ya generado automáticamente)
   AWS_REGION=us-east-2
   AWS_S3_EMPLOYEE_BUCKET_NAME=novack-employees-s3
   AWS_S3_SUPPLIER_BUCKET_NAME=novack-suppliers-s3
   AWS_S3_VISITOR_BUCKET_NAME=novack-visitors-s3
   EMAIL_FROM_SECURITY=security@spcedes.com
   LOG_LEVEL=info
   ```

4. **Generar Dominio Público:**
   - En el servicio del backend, ve a **"Settings"**
   - Sección **"Networking"**
   - Click en **"Generate Domain"**
   - Copia la URL generada (ej: `https://novack-backend-production.up.railway.app`)

5. **Actualizar FRONTEND_URL:**
   - Si tienes frontend, actualiza la variable `NEXT_PUBLIC_API_URL` con la URL del backend

## 🎯 Arquitectura Final

```
┌─────────────────────────────────────────┐
│      Proyecto "novack" en Railway      │
├─────────────────────────────────────────┤
│                                         │
│  📦 Servicio 1: PostgreSQL             │
│     └─ Base de datos principal         │
│                                         │
│  📦 Servicio 2: Redis                  │
│     └─ Cache y sesiones                │
│                                         │
│  📦 Servicio 3: Backend (NestJS)       │
│     ├─ Dockerfile multi-stage          │
│     ├─ Node.js 20 Alpine               │
│     ├─ Puerto: $PORT (auto)            │
│     ├─ Health Check: /health           │
│     └─ Conecta a PostgreSQL + Redis    │
│                                         │
└─────────────────────────────────────────┘
```

## 🔍 Verificación del Despliegue

Una vez que Railway termine de construir y desplegar:

```bash
# Ver logs del despliegue
railway logs --service backend

# Probar health check
curl https://TU-URL.railway.app/health

# Debería responder:
# {"status":"ok","timestamp":"..."}
```

## 🛠️ Comandos Útiles

```bash
# Ver estado del proyecto
railway status

# Ver logs en vivo
railway logs

# Ver todas las variables
railway variables

# Redeploy
railway up

# Abrir dashboard
open https://railway.app/project/dceb2b2c-c496-48f9-8539-7eb8e5b33ba9

# Ejecutar seeds (después del primer deploy exitoso)
railway run npm run seed
```

## ⚠️ Importante

1. **Cada servicio corre en su propio contenedor** - PostgreSQL, Redis y Backend son independientes
2. **Las referencias `${{Service.VARIABLE}}`** permiten que los servicios se comuniquen
3. **Railway asigna el puerto automáticamente** - Tu app usa `process.env.PORT`
4. **El Dockerfile multi-stage** optimiza el tamaño de la imagen (solo ~150-200MB)
5. **El health check** en `/health` permite a Railway monitorear tu app

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs: `railway logs`
2. Verifica las variables: `railway variables`
3. Consulta la documentación: https://docs.railway.app

---

**¡Todo está listo para desplegar! Solo necesitas hacer push a GitHub y conectar el repo en Railway.** 🚀

