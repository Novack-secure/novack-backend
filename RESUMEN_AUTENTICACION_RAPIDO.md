# RESUMEN RÁPIDO: Sistema de Autenticación y Autorización - Novack

## Estructura del Sistema Actual

```
AUTENTICACIÓN (JWT)
├── Token válido por 15 minutos
├── Payload incluye:
│   ├── id (UUID del empleado)
│   ├── email
│   ├── name
│   ├── supplier_id (UUID del supplier)
│   ├── is_creator (boolean)
│   └── jti (ID único del token)
└── Validación con bcrypt en credenciales

AUTORIZACIÓN (Guards)
├── AuthGuard
│   └── Verifica JWT válido en header "Authorization: Bearer <token>"
│       └── Guarda información en request.user
│
├── SupplierAccessGuard
│   └── Verifica que usuario.supplier_id == parámetro.supplier_id
│       └── Usuario sin supplier_id = Admin (acceso a todo)
│
└── WsJwtGuard (WebSocket)
    └── Verifica JWT en WebSocket handshake

AISLAMIENTO DE DATOS
├── Por supplier_id (empleados solo ven su proveedor)
├── En chat: empleados filtrados por supplier
└── En búsquedas: solo contactos del mismo supplier
```

## 1. ¿Existe una entidad de Roles o Permisos?

**NO.** El sistema NO tiene:
- Entidad `Role`
- Entidad `Permission`
- Relaciones RBAC (Role-Based Access Control)

**QUÉ TIENE:**
- Flag booleano `is_creator` en la tabla `employees`
- Aislamiento por `supplier_id`

## 2. ¿Cómo se manejan actualmente los permisos?

**Sistema simple basado en:**

1. **Autenticación:** JWT de 15 minutos
   - Validar token en header Authorization
   - Token inválido = UnauthorizedException

2. **Autorización - Nivel 1:** Por Supplier
   - `user.supplier_id === parámetro.supplier_id`
   - Usuario sin supplier_id = Admin (acceso a todo)
   - Otros = Solo su supplier

3. **Autorización - Nivel 2:** Flag is_creator
   - `is_creator: true` = Creador del supplier
   - `is_creator: false` = Empleado normal
   - NO hay permisos granulares basados en esto

**FALTA:**
- Permisos granulares (read, create, update, delete)
- Delegación de permisos
- Roles jerárquicos

## 3. ¿Hay guards o middlewares de autorización?

**SÍ, hay 4 guards:**

| Guard | Ubicación | Propósito |
|-------|-----------|----------|
| `AuthGuard` | `/src/application/guards/auth.guard.ts` | Verificar JWT válido |
| `SupplierAccessGuard` | `/src/application/guards/supplier-access.guard.ts` | Aislar por supplier_id |
| `WsJwtGuard` | `/src/application/guards/ws-jwt.guard.ts` | Autenticar WebSocket |
| `CustomThrottlerGuard` | `/src/application/guards/throttler.guard.ts` | Rate limiting (5/50/100 req/min) |

**Uso en controladores:**
```typescript
@UseGuards(AuthGuard)  // Requiere JWT
@UseGuards(SupplierAccessGuard)  // + Verifica supplier_id
@Public()  // Salta AuthGuard
```

## 4. ¿Qué estructura tiene la entidad Employee en cuanto a roles?

```typescript
@Entity({ name: "employees" })
export class Employee {
  // ... campos básicos ...
  
  is_creator: boolean;  // ÚNICA DIFERENCIACIÓN DE ROL
                        // true = Creador del supplier
                        // false = Empleado normal
  
  supplier_id: string;  // AISLAMIENTO DE DATOS
                        // Solo ve empleados del mismo supplier
  
  supplier: Supplier;   // Relación ManyToOne
  credentials: EmployeeCredentials;  // Credenciales (contraseña, bloqueos)
}
```

**NO hay campos como:**
- `role: string`
- `permissions: string[]`
- `department_id: UUID`
- `manager_id: UUID`

## 5. Archivos clave del sistema de autenticación y autorización

```
/src/domain/entities/
├── employee.entity.ts              (is_creator: boolean)
├── supplier.entity.ts              (proveedor)
└── employee-credentials.entity.ts  (contraseña, bloqueos)

/src/application/guards/
├── auth.guard.ts                   (Verificar JWT)
├── supplier-access.guard.ts        (Aislar por supplier_id)
├── ws-jwt.guard.ts                 (WebSocket auth)
└── throttler.guard.ts              (Rate limiting)

/src/application/decorators/
├── public.decorator.ts             (Marcar rutas públicas)
├── audit-access.decorator.ts       (Registrar auditoría)
└── ws-auth-user.decorator.ts       (Inyectar usuario en WS)

/src/application/services/
├── token.service.ts                (Generar y validar JWT)
├── auth.service.ts                 (Validar credenciales)
└── supplier.service.ts             (Crear empleado creador)

/src/application/modules/
├── auth.module.ts                  (Configuración Auth)
└── token.module.ts                 (Configuración JWT)

/src/application/strategies/
└── jwt.strategy.ts                 (Validar payload JWT)
```

## Flujo de Login y Acceso

```
1. POST /auth/login
   └─> Email + Password
       └─> AuthService.validateEmployee()
           ├─ Buscar employee con email
           ├─ Comparar password con bcrypt
           ├─ Verificar no esté bloqueado (10 intentos = 15 min bloqueado)
           └─ Si OK: Generar JWT
               └─> TokenService.generateTokens()
                   ├─ Crear payload con: id, email, supplier_id, is_creator
                   └─ Firmar token (válido 15 minutos)
       └─> Retornar { access_token }

2. GET /api/protected
   ├─ Header: Authorization: Bearer <token>
   └─> AuthGuard
       ├─ ¿Es @Public()? → Pasar
       ├─ ¿Token en header? → SÍ/NO
       ├─ ¿Token válido? → SÍ/NO
       └─ Guardar en request.user
           ├─ request.user.id
           ├─ request.user.supplier_id
           ├─ request.user.is_creator
           └─ request.user.email
       └─> (Opcional) SupplierAccessGuard
           ├─ ¿user.supplier_id == parámetro.supplierId?
           └─ SÍ → Pasar, NO → ForbiddenException
       └─> Lógica del controlador
```

## Seguridad Implementada

- ✅ JWT con expiración (15 min)
- ✅ Contraseñas con bcrypt
- ✅ Bloqueo por intentos fallidos (10 intentos = 15 min bloqueado)
- ✅ Rate limiting (diferente por ruta)
- ✅ Aislamiento por supplier_id
- ✅ Auditoría de accesos (decorador)
- ✅ CSRF protection (módulo disponible)
- ✅ WebSocket con autenticación

## Seguridad NO Implementada

- ❌ Roles con permisos granulares
- ❌ Control de acceso por acción (read/create/update/delete)
- ❌ Delegación de permisos
- ❌ 2FA (disponible en módulo TwoFactorAuthModule)
- ❌ OAuth2/OpenID Connect
- ❌ Refresh tokens (no mencionados en el código)

## Limitaciones Actuales

1. **Solo 2 tipos de usuario (implícitos):**
   - Creador del supplier (`is_creator: true`)
   - Empleado normal (`is_creator: false`)

2. **Sin permisos por acción:**
   - No hay forma de que un usuario NO creador pueda tener permisos específicos

3. **Sin jerarquía de roles:**
   - No hay super-admin vs admin vs manager vs employee

4. **Difícil de escalar:**
   - Agregar nuevos tipos de permisos requiere cambios en múltiples lugares

## Para Mejorar a RBAC Completo

Sería necesario:
1. Crear tabla `roles` (ADMIN, MANAGER, EMPLOYEE, etc.)
2. Crear tabla `permissions` (read:employees, create:visitors, etc.)
3. Crear tabla intermedia `role_permissions`
4. Agregar `role_id` a `employees`
5. Crear guards: `@RequireRole('admin')`, `@RequirePermission('read:employees')`
6. Actualizar JWT para incluir array de permisos

