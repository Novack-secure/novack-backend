# Diagramas de Arquitectura - Sistema de Permisos y Autenticación

## 1. Flujo Completo de Autenticación

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        USUARIO FINAL (Frontend)                         │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │
                      ├─ Inicia sesión con email + password
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              POST /auth/login                                            │
│              ┌──────────────────────────────────────────────────┐        │
│              │ AuthController.login(dto)                       │        │
│              └──────────────┬─────────────────────────────────┘        │
│                             │                                          │
│                             ▼                                          │
│              ┌──────────────────────────────────────────────────┐        │
│              │ AuthService.validateEmployee(email, password)   │        │
│              │                                                 │        │
│              │ 1. Buscar employee:                             │        │
│              │    WHERE email = input                          │        │
│              │    WITH relations: [credentials, supplier]      │        │
│              │                                                 │        │
│              │ 2. Verificar credenciales:                      │        │
│              │    - ¿Existe employee? → NO → Error            │        │
│              │    - ¿Está bloqueado? (locked_until > now) →   │        │
│              │      SÍ → Error                                 │        │
│              │    - ¿Contraseña válida? bcrypt.compare() →    │        │
│              │      NO → Incrementar login_attempts            │        │
│              │          Si login_attempts >= 10:               │        │
│              │            locked_until = now + 15min           │        │
│              │            Guardar credenciales                 │        │
│              │      SÍ → Reset login_attempts, continuar       │        │
│              │                                                 │        │
│              │ 3. Obtener información del supplier (relación)  │        │
│              └──────────────┬─────────────────────────────────┘        │
│                             │                                          │
│                             ▼                                          │
│              ┌──────────────────────────────────────────────────┐        │
│              │ TokenService.generateTokens(employee)           │        │
│              │                                                 │        │
│              │ Crear payload JWT:                              │        │
│              │ {                                               │        │
│              │   sub: employee.id (UUID),                      │        │
│              │   email: employee.email,                        │        │
│              │   name: "First Last",                           │        │
│              │   supplier_id: employee.supplier.id,            │        │
│              │   is_creator: employee.is_creator (boolean),    │        │
│              │   jti: uuidv4() (unique token ID),              │        │
│              │   iat: timestamp                                │        │
│              │ }                                               │        │
│              │                                                 │        │
│              │ Firmar token con JWT secret                     │        │
│              │ Expiración: 15 minutos                          │        │
│              └──────────────┬─────────────────────────────────┘        │
│                             │                                          │
│                             ▼                                          │
│              ┌──────────────────────────────────────────────────┐        │
│              │ RESPUESTA:                                       │        │
│              │ {                                               │        │
│              │   access_token: "eyJhbGc...",                   │        │
│              │   expires_in: 900                               │        │
│              │ }                                               │        │
│              └──────────────┬─────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
          ┌────────────────────────────────────────┐
          │ Cliente guarda token en localStorage   │
          │ o memoria                              │
          └────────────────────────────────────────┘
```

## 2. Flujo de Acceso a Endpoint Protegido

```
┌─────────────────────────────────────────────────────────────────────────┐
│        GET /api/employees/me                                             │
│        Header: Authorization: Bearer eyJhbGc...                          │
│        Header: X-Forwarded-For: 192.168.1.1 (para rate limiting)        │
└─────────────────────────────────────────────┬───────────────────────────┘
                                              │
                                              ▼
                        ┌─────────────────────────────────────┐
                        │ GLOBAL GUARDS & INTERCEPTORS        │
                        └──────────┬──────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
         ┌──────────────────────┐    ┌──────────────────────┐
         │ CustomThrottlerGuard │    │ (Otros pipes/        │
         │                      │    │  interceptors)       │
         │ Rate Limiting:       │    └──────────────────────┘
         │ - login: 5/min       │
         │ - api: 50/min        │
         │ - default: 100/min   │
         │                      │
         │ Tracker: ${IP}-${URL}│
         │                      │
         │ ¿Límite excedido? → │
         │ SÍ: Error 429        │
         │ NO: Continuar        │
         └──────────────────────┘
                    │
                    ▼
         ┌──────────────────────────────────────────────┐
         │ AuthGuard.canActivate()                      │
         │                                              │
         │ ¿Es ruta @Public()?                          │
         │ SÍ → Pasar al siguiente guard/controlador     │
         │                                              │
         │ ¿Header Authorization?                       │
         │ NO → UnauthorizedException                   │
         │ SÍ → Extraer token (Bearer <token>)          │
         │                                              │
         │ ¿Token válido?                               │
         │ TokenService.validateToken(token)            │
         │  - Verificar firma JWT                       │
         │  - Verificar expiración (15 min)             │
         │  - Verificar jti único                       │
         │ NO → UnauthorizedException                   │
         │ SÍ → Extraer payload                         │
         │                                              │
         │ JwtStrategy.validate(payload)                │
         │ Retorna:                                     │
         │ {                                            │
         │   id: payload.sub,                           │
         │   email: payload.email,                      │
         │   name: payload.name,                        │
         │   is_creator: payload.is_creator,            │
         │   supplier_id: payload.supplier_id           │
         │ }                                            │
         │                                              │
         │ request.user = payload                       │
         └──────────┬───────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────────────────────────────┐
         │ SupplierAccessGuard.canActivate()            │
         │ (Opcional - se aplica si en controlador hay: │
         │  @UseGuards(SupplierAccessGuard))            │
         │                                              │
         │ request.user = {                             │
         │   id: UUID,                                  │
         │   email: string,                             │
         │   supplier_id: UUID | null,                  │
         │   is_creator: boolean                        │
         │ }                                            │
         │                                              │
         │ ¿Hay supplierId en parámetro/body?           │
         │ NO → Pasar (No hay restricción)              │
         │                                              │
         │ ¿Usuario sin supplier_id?                    │
         │ SÍ → Pasar (Es Admin/Superuser)              │
         │                                              │
         │ ¿user.supplier_id === parámetro.supplierId?  │
         │ SÍ → Pasar                                   │
         │ NO → ForbiddenException                      │
         │      "No tienes permiso para acceder a       │
         │       recursos de otro proveedor"            │
         └──────────┬───────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────────────────────────────┐
         │ EmployeeController.getCurrentUser(@Req req)  │
         │                                              │
         │ req.user disponible y validado:              │
         │ - Autenticado (token válido)                 │
         │ - Autorizado (supplier_id coincide)          │
         │                                              │
         │ Lógica del controlador:                      │
         │ const employee = await                       │
         │   employeeService.findOne(req.user.id)       │
         │                                              │
         │ RESPUESTA 200 OK:                            │
         │ {                                            │
         │   id: UUID,                                  │
         │   first_name: string,                        │
         │   last_name: string,                         │
         │   email: string,                             │
         │   supplier: { id, name, ... },               │
         │   is_creator: boolean                        │
         │ }                                            │
         └──────────────────────────────────────────────┘
```

## 3. Estructura de Guards - Decisiones de Acceso

```
                         ┌─ Solicitud HTTP ─┐
                         │ Authorization    │
                         │ /api/path        │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │                           │
                    ▼                           ▼
            ┌────────────────┐        ┌────────────────┐
            │ AuthGuard      │        │ CustomThrottler│
            │ (Autenticación)│        │ Guard (Rate)   │
            └────────┬───────┘        └────────┬───────┘
                     │                         │
    ┌────────────────┴──────┬──────────────────┘
    │                       │
    ▼                       ▼
┌──────────┐          ┌──────────┐
│ @Public? │          │Rate OK?  │
└─────┬────┘          └─────┬────┘
  SÍ│NO               SÍ│NO
   │                     │
   ▼ ▼                    ▼
 PASS FAIL          PASS / FAIL
   │   │
   │   ▼
   │ Unauthorized
   │ Exception
   │
   ▼
┌──────────────┐
│ Token en     │
│ header?      │
└──────┬───────┘
   SÍ │ NO
    ├─────────────┐
    │             │
    ▼             ▼
 VALIDATE       FAIL
    │
    ├─────┐
    │     │
  VALID INVALID
    │     │
    ▼     ▼
  PASS   FAIL
    │     │
    │     ▼
    │  Unauthorized
    │  Exception
    │
    ▼
┌─────────────────────────────────────┐
│ Store in request.user               │
│ {                                   │
│   id, email, name,                  │
│   supplier_id, is_creator           │
│ }                                   │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ SupplierAccessGuard                 │
│ (Si @UseGuards(SupplierAccessGuard))│
└────────────────┬────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌──────────────────┐  ┌──────────────────┐
│ supplierId en    │  │ user.supplier_id │
│ request?         │  │ == null?          │
└────────┬─────────┘  └────────┬─────────┘
     NO │ SÍ              SÍ │ NO
       │                    │
       └────────┬───────────┘
              (PASS)
                │
                ▼
        ┌───────────────────┐
        │ user.supplier_id ==│
        │ supplierId?       │
        └────────┬──────────┘
             SÍ │ NO
              ├─────┐
              │     │
            PASS   FAIL
              │     │
              │     ▼
              │  Forbidden
              │  Exception
              │
              ▼
     ┌────────────────────┐
     │ Controlador        │
     │ Lógica de negocio  │
     │ (Seguro)           │
     └────────────────────┘
```

## 4. Modelo de Datos - Tablas Relacionadas

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TABLAS DE AUTENTICACIÓN                          │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┐
│        SUPPLIERS TABLE           │
├──────────────────────────────────┤
│ id (UUID) PRIMARY KEY            │
│ supplier_name (STRING)           │
│ supplier_creator (STRING)        │
│ contact_email (STRING)           │
│ phone_number (STRING)            │
│ address (STRING)                 │
│ created_at (TIMESTAMP)           │
│ updated_at (TIMESTAMP)           │
└──────────────────────────────────┘
           ▲
           │ 1
           │
           │ ManyToOne
           │
           │ N
┌──────────────────────────────────────────────────────────────────────┐
│                    EMPLOYEES TABLE                                   │
├──────────────────────────────────────────────────────────────────────┤
│ id (UUID) PRIMARY KEY                                               │
│ first_name (STRING)                                                 │
│ last_name (STRING)                                                  │
│ email (STRING) UNIQUE                                               │
│ phone (STRING, nullable)                                            │
│ position (STRING, nullable)                                         │
│ department (STRING, nullable)                                       │
│ profile_image_url (STRING, nullable)                                │
│ is_creator (BOOLEAN) ◄─── ÚNICA DIFERENCIACIÓN DE PERMISOS          │
│ supplier_id (UUID) FOREIGN KEY → suppliers.id                       │
│ created_at (TIMESTAMP)                                              │
│ updated_at (TIMESTAMP)                                              │
└──────────────────────────────────────────────────────────────────────┘
           ▲
           │ 1
           │
           │ OneToOne
           │
           │ 1
┌──────────────────────────────────────────────────────────────────────┐
│                 EMPLOYEE_CREDENTIALS TABLE                            │
├──────────────────────────────────────────────────────────────────────┤
│ id (UUID) PRIMARY KEY                                               │
│ password_hash (STRING) - bcrypt                                      │
│ login_attempts (INT) - Counter para bloqueo                          │
│ locked_until (TIMESTAMP, nullable) - Bloqueo temporal                │
│ last_login (TIMESTAMP, nullable)                                     │
│ employee_id (UUID) FOREIGN KEY → employees.id                        │
│ created_at (TIMESTAMP)                                              │
│ updated_at (TIMESTAMP)                                              │
└──────────────────────────────────────────────────────────────────────┘

NOTAS IMPORTANTES:
- NO hay tabla de ROLES
- NO hay tabla de PERMISSIONS
- NO hay ManyToMany entre employees y permissions
- AISLAMIENTO: employees.supplier_id filtra acceso a datos
- AUTENTICACIÓN: password_hash + bcrypt
- BLOQUEO: login_attempts >= 10 → locked_until = now + 15min
```

## 5. JWT Payload y Validación

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      JWT TOKEN ANATOMY                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐
│ HEADER (Base64 encoded)     │
├─────────────────────────────┤
│ {                           │
│   "alg": "HS256",           │
│   "typ": "JWT"              │
│ }                           │
└─────────────────────────────┘
           │
           │ .
           ▼
┌─────────────────────────────────────────────────────┐
│ PAYLOAD (Base64 encoded)                            │
├─────────────────────────────────────────────────────┤
│ {                                                   │
│   "sub": "550e8400-e29b-41d4-a716-446655440000",   │ ◄─ employee.id
│   "email": "user@empresa.com",                      │ ◄─ employee.email
│   "name": "Juan Pérez",                             │ ◄─ first_name + last_name
│   "supplier_id": "123e4567-e89b-12d3-a456-...",    │ ◄─ supplier.id (Aislamiento)
│   "is_creator": true,                               │ ◄─ Diferenciador único
│   "jti": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",   │ ◄─ JWT ID único
│   "iat": 1699357200,                                │ ◄─ Issued At timestamp
│   "exp": 1699358100                                 │ ◄─ Expiration (15 min después)
│ }                                                   │
└─────────────────────────────────────────────────────┘
           │
           │ .
           ▼
┌──────────────────────────────────────┐
│ SIGNATURE (HMAC-SHA256)              │
├──────────────────────────────────────┤
│ HMACSHA256(                          │
│   base64UrlEncode(header) + "." +   │
│   base64UrlEncode(payload),         │
│   JWT_SECRET                         │
│ )                                    │
└──────────────────────────────────────┘

VALIDACIÓN:
1. ¿Firma válida? (usando JWT_SECRET)
2. ¿Token no expirado? (exp > now)
3. ¿JTI único? (prevenir token reuse)
4. ¿Payload íntegro? (no modificado)

INCLUSIÓN EN REQUEST:
request.user = {
  id: payload.sub,
  email: payload.email,
  name: payload.name,
  supplier_id: payload.supplier_id,
  is_creator: payload.is_creator
}

DISPONIBILIDAD EN CONTROLADOR:
@Get('me')
@UseGuards(AuthGuard)
async getCurrentUser(@Req() req) {
  req.user.id         // ✓ Disponible
  req.user.supplier_id // ✓ Disponible
  req.user.is_creator  // ✓ Disponible
}
```

## 6. Flujo WebSocket - Chat

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     WEBSOCKET AUTHENTICATION                            │
└─────────────────────────────────────────────────────────────────────────┘

CLIENTE (Frontend):
┌──────────────────────────────────────────────┐
│ 1. const socket = io(url, {                 │
│      query: { token: jwtToken } ◄─ De JWT   │
│    })                                        │
│                                              │
│ 2. socket.on('connect', () => {              │
│      // Conectado y autenticado              │
│    })                                        │
└──────────────────────────────────────────────┘
           │
           │ WebSocket Handshake
           │ query: { token: "eyJ..." }
           │
           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  SERVIDOR (Backend)                                  │
│                                                                      │
│  Uso en Gateway:                                                     │
│  @UseGuards(WsJwtGuard)                                             │
│  @WebSocketGateway()                                                │
│  export class ChatGateway {                                         │
│    @SubscribeMessage('joinRoom')                                    │
│    handleJoinRoom(                                                  │
│      @ConnectedSocket() client: Socket,                             │
│      @MessageBody() data: any,                                      │
│      @WsAuthUser() user: any  ◄─ Usuario inyectado                 │
│    ) {                                                              │
│      // user = { id, userType, supplier, ... }                      │
│    }                                                                │
│  }                                                                  │
│                                                                      │
│  WsJwtGuard:                                                        │
│  1. Extraer token de query/auth/headers                            │
│  2. Verificar JWT (misma validación que HTTP)                       │
│  3. Buscar employee/visitor en BD                                   │
│  4. CARGAR RELACIÓN supplier (CRÍTICO!)                            │
│     WHERE { id: payload.sub }                                       │
│     WITH relations: ["supplier"]                                    │
│  5. Guardar en context.data.user y socket["user"]                  │
│  6. Filtrar mensajes por supplier_id                                │
└──────────────────────────────────────────────────────────────────────┘

IMPORTANTE: WsJwtGuard CARGA la relación supplier
Esto asegura que:
- Empleados del supplier A NO ven mensajes del supplier B
- El filtrado de datos es SEGURO en tiempo de ejecución
```

## 7. Tabla Comparativa - Guards y Decoradores

```
╔════════════════════════════════════════════════════════════════════════════╗
║ GUARD/DECORATOR   │ UBICACIÓN              │ PROPÓSITO                     ║
╠════════════════════════════════════════════════════════════════════════════╣
║ AuthGuard         │ guards/auth.guard.ts   │ Verificar JWT válido           ║
║ Método: CanActivate│ ¿Token?               │ Validar firma y expiración     ║
║ Nivel: HTTP/WS    │ ¿Expirado?            │ Guardar payload en request     ║
║                   │ ¿Válido?              │                                ║
║───────────────────┼────────────────────────┼────────────────────────────────║
║ SupplierAccessGuard│ guards/supplier-...   │ Aislar por supplier_id        ║
║ Método: CanActivate│ ¿Hay supplierId?      │ Evitar acceso cross-supplier  ║
║ Nivel: HTTP       │ ¿user.supplier_id     │ Exception: ForbiddenException ║
║                   │  == supplierId?       │                                ║
║───────────────────┼────────────────────────┼────────────────────────────────║
║ WsJwtGuard        │ guards/ws-jwt.guard.ts│ Autentica WebSocket           ║
║ Método: CanActivate│ ¿Token en WS?         │ Carga relación supplier       ║
║ Nivel: WebSocket  │ ¿Válido?              │ CRÍTICO para filtrado seguro  ║
║                   │ ¿Usuario existe?      │                                ║
║───────────────────┼────────────────────────┼────────────────────────────────║
║ CustomThrottler   │ guards/throttler....  │ Rate limiting (prevenir DDoS) ║
║ Guard             │ Diferentes límites     │ 5, 50, 100 req/min            ║
║ Método: ThrottlerGuard│ por ruta           │ Basado en IP + URL            ║
║ Nivel: HTTP       │                        │                                ║
║───────────────────┼────────────────────────┼────────────────────────────────║
║ @Public()         │ decorators/public...   │ Saltar AuthGuard             ║
║ Método: Metadata  │ Rutas públicas         │ No requiere JWT              ║
║ Nivel: HTTP       │                        │                                ║
║───────────────────┼────────────────────────┼────────────────────────────────║
║ @AuditAccess()    │ decorators/audit-...   │ Registrar acceso a datos      ║
║ Método: Decorator │ Acción + Recurso       │ Logs: user, action, resource  ║
║ Nivel: HTTP       │                        │                                ║
║───────────────────┼────────────────────────┼────────────────────────────────║
║ @WsAuthUser()     │ decorators/ws-auth-... │ Inyectar usuario en WS        ║
║ Método: ParamDecorator│ Obtiene de socket  │ Alternativa a @Req()          ║
║ Nivel: WebSocket  │                        │                                ║
╚════════════════════════════════════════════════════════════════════════════╝
```

## 8. Seguridad - Capas Implementadas

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CAPAS DE SEGURIDAD IMPLEMENTADAS                     │
└─────────────────────────────────────────────────────────────────────────┘

CAPA 1: CONTRASEÑA
┌──────────────────────────────────────────────────────────────────────┐
│ Almacenamiento:                                                      │
│ - bcrypt con salt (hash irreversible)                                │
│ - password_hash en employee_credentials                              │
│                                                                      │
│ Validación:                                                          │
│ - bcrypt.compare(input_password, stored_hash)                        │
│ - Comparación en tiempo constante (previene timing attacks)          │
└──────────────────────────────────────────────────────────────────────┘

CAPA 2: BLOQUEO DE CUENTA
┌──────────────────────────────────────────────────────────────────────┐
│ Por intentos fallidos:                                               │
│ - Contador: login_attempts                                           │
│ - Límite: 10 intentos                                                │
│ - Acción: locked_until = now + 15 minutos                            │
│                                                                      │
│ Beneficio:                                                           │
│ - Previene fuerza bruta                                              │
│ - Tiempo fijo de bloqueo (no exponencial)                            │
└──────────────────────────────────────────────────────────────────────┘

CAPA 3: JWT CON EXPIRACIÓN
┌──────────────────────────────────────────────────────────────────────┐
│ Token:                                                               │
│ - Expiración: 15 minutos                                             │
│ - ID único: jti (previene token reuse)                               │
│ - Firma: HMAC-SHA256 con JWT_SECRET                                  │
│                                                                      │
│ Validación:                                                          │
│ - Verificar firma antes de usar                                      │
│ - Verificar no expirado (exp > now)                                  │
│ - Verificar jti es único                                             │
└──────────────────────────────────────────────────────────────────────┘

CAPA 4: RATE LIMITING
┌──────────────────────────────────────────────────────────────────────┐
│ Por ruta:                                                            │
│ - login:   5 req/min                                                 │
│ - api:     50 req/min                                                │
│ - default: 100 req/min                                               │
│                                                                      │
│ Tracker: ${IP}-${URL}                                                │
│ Beneficio:                                                           │
│ - Previene DDoS                                                      │
│ - Previene fuerza bruta de login                                     │
└──────────────────────────────────────────────────────────────────────┘

CAPA 5: AISLAMIENTO POR SUPPLIER
┌──────────────────────────────────────────────────────────────────────┐
│ Filtrado:                                                            │
│ - user.supplier_id === parámetro.supplierId                          │
│ - Empleado A NO ve datos de Empleado B (distinto supplier)           │
│                                                                      │
│ Guards:                                                              │
│ - SupplierAccessGuard en HTTP                                        │
│ - WsJwtGuard carga supplier en WebSocket                             │
│ - Filtrado en servicios (findBySupplier)                             │
│                                                                      │
│ Beneficio:                                                           │
│ - Multi-tenancy seguro                                               │
│ - Previene data leakage entre suppliers                              │
└──────────────────────────────────────────────────────────────────────┘

CAPA 6: AUDITORÍA
┌──────────────────────────────────────────────────────────────────────┐
│ Registro:                                                            │
│ - @AuditAccess(action, resourceType)                                 │
│ - user.id, action, resourceType, IP, User-Agent                      │
│ - Timestamps                                                         │
│                                                                      │
│ Beneficio:                                                           │
│ - Trazabilidad                                                       │
│ - Detección de actividades sospechosas                               │
│ - Cumplimiento normativo                                             │
└──────────────────────────────────────────────────────────────────────┘

CAPA 7: VALIDACIÓN JWT
┌──────────────────────────────────────────────────────────────────────┐
│ JwtStrategy:                                                         │
│ - Valida payload antes de inyectar en request                        │
│ - Verifica campos requeridos                                         │
│ - Retorna datos permitidos                                           │
│                                                                      │
│ Beneficio:                                                           │
│ - Previene inyección de datos maliciosos                             │
│ - Whitelist de campos en payload                                     │
└──────────────────────────────────────────────────────────────────────┘

CAPA 8: CSRF
┌──────────────────────────────────────────────────────────────────────┐
│ Módulo: CsrfModule (instalado pero no mostrado en app.module)        │
│ Beneficio:                                                           │
│ - Previene ataques CSRF                                              │
│ - CSRF tokens en formularios                                         │
└──────────────────────────────────────────────────────────────────────┘

NO IMPLEMENTADO:
- 2FA (módulo TwoFactorAuthModule disponible)
- Refresh tokens (solo access token)
- OAuth2/OpenID Connect
- CORS configuración específica
- Helmet security headers (parcial)
```

