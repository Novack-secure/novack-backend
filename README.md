# Novack Backend

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/EstebanCanales/novack-backend)

## Description

Backend service for Novack project built with NestJS. This system provides a robust API for managing access control, employee management, visitor tracking, and security monitoring in corporate environments.

### Key Features

- 🔐 Authentication and Authorization System
- 👥 Employee Management
- 🎫 Access Card Control
- 📱 Two-Factor Authentication
- 🏢 Visitor Management
- 🔍 Security Monitoring
- 📊 Sensor Data Management
- 📧 Email Notifications and Verification
- 🛡️ Rate Limiting Protection
- 🏭 Supplier Management

### Architecture

The application follows Clean Architecture principles with a modular design:

- **Application Layer**: Controllers, DTOs, and Services
- **Domain Layer**: Business entities and core logic
- **Infrastructure Layer**: Database connections and external services
- **Interface Layer**: REST API endpoints and controllers

### Technologies

- NestJS Framework
- PostgreSQL Database
- Redis for Caching
- JWT Authentication
- TypeORM
- Docker Containerization

## Prerequisites

- Docker
- Docker Compose
- Node.js (for local development)
- pnpm (for local development)

## Installation

### Using Docker (Recommended)

1. Clone the repository

```bash
git clone [your-repository-url]
cd spcedes-backend
```

2. Copy the environment file

```bash
cp .env.example .env
```

3. Update the environment variables in `.env` if needed

4. Start the application using Docker Compose

```bash
docker-compose up --build
```

The application will be available at:

- API: http://localhost:4000
- PostgreSQL: localhost:5434
- Redis: localhost:6379

### Local Development

1. Install dependencies

```bash
pnpm install
```

2. Copy and configure environment variables

```bash
cp .env.example .env
```

3. Start the application

```bash
pnpm run start:dev
```

## Testing

```bash
# unit tests
pnpm run test

# e2e tests
pnpm run test:e2e

# test coverage
pnpm run test:cov
```

## Docker Configuration

The project includes:

- `Dockerfile` for building the application container
- `docker-compose.yml` for orchestrating all services (API, PostgreSQL, Redis)
- Persistent volumes for database and cache data
- Automatic database connection handling

## Environment Variables

Para configurar correctamente la aplicación, necesitas definir las siguientes variables de entorno:

### Base de datos

```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=your_database
```

### JWT

```
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=24h
```

### Aplicación

```
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Email

```
RESEND_API_KEY=your_resend_api_key
```

### Redis

```
REDIS_URL=redis://username:password@host:port
REDIS_USERNAME=default
REDIS_PASSWORD=your_redis_password
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Postgres (Docker)

```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=spcedes
```

### ESP32 Cards

```
ESP32_AUTH_KEY=your_esp32_auth_key
```

### AWS S3

```
AWS_REGION=us-east-2
AWS_S3_EMPLOYEE_BUCKET_NAME=your-employees-bucket
AWS_S3_SUPPLIER_BUCKET_NAME=your-suppliers-bucket
AWS_S3_VISITOR_BUCKET_NAME=your-visitors-bucket
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
```

### Cookie

```
COOKIE_SECRET=your_cookie_secret
```

### Logging

```
LOG_LEVEL=info
LOG_TO_FILE=true
ELK_ENABLED=true
ELK_HOST=http://localhost:9200
APP_NAME=novack-backend
```

## Módulo de Chat

El sistema incluye un módulo de chat en tiempo real con WebSockets que permite:

- Chats individuales entre empleados
- Chats entre empleados y visitantes
- Grupos de chat para todos los empleados de un mismo proveedor

### Características:

- Comunicación en tiempo real usando Socket.IO
- Persistencia de mensajes en base de datos
- Notificaciones de mensajes nuevos
- Historial de conversaciones
- Marcado de lectura de mensajes

### API REST para Chat:

- `GET /chat/rooms` - Obtener todas las salas de chat del usuario
- `GET /chat/rooms/:id/messages` - Obtener mensajes de una sala
- `POST /chat/rooms` - Crear una nueva sala de chat
- `POST /chat/messages` - Enviar un mensaje a una sala
- `POST /chat/rooms/supplier/:supplierId` - Crear sala de grupo para un proveedor
- `POST /chat/rooms/private` - Crear sala privada entre dos usuarios

### Eventos WebSocket:

- `registerUser` - Registrar usuario en el sistema de chat
- `joinRoom` - Unirse a una sala de chat
- `leaveRoom` - Salir de una sala de chat
- `sendMessage` - Enviar mensaje a una sala
- `createPrivateRoom` - Crear sala privada con otro usuario
- `getRoomMessages` - Obtener mensajes de una sala
- `getUserRooms` - Obtener salas del usuario

# Sistema de Logging Estructurado

## Características

El sistema de logging implementado ofrece las siguientes características:

- Logs estructurados en formato JSON
- Seguimiento de solicitudes con correlationId
- Niveles de log configurables (debug, info, warn, error)
- Integración con ELK Stack (Elasticsearch, Logstash, Kibana)
- Soporte para logs en archivos y en consola
- Contexto de ejecución para enriquecer los logs
