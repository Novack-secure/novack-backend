# ANÁLISIS COMPLETO: Sistema de Roles, Permisos y Autenticación - Novack Backend

## 1. ENTIDADES DE DOMINIO

### Employee Entity
Ubicación: `/Users/estebancanales/Work/novack/backend/src/domain/entities/employee.entity.ts`

```typescript
@Entity({ name: "employees" })
export class Employee {
  id: string;                    // UUID primario
  first_name: string;
  last_name: string;
  email: string;                 // Unique
  phone?: string;
  position?: string;
  department?: string;
  profile_image_url?: string;
  is_creator: boolean;           // FLAG CLAVE: Indica si es creador del supplier
  created_at: Date;
  updated_at: Date;
  
  // Relaciones
  supplier: Supplier;            // ManyToOne - Pertenece a un supplier
  supplier_id: string;           // Foreign key
  chat_rooms: ChatRoom[];        // ManyToMany - Salas de chat
  credentials: EmployeeCredentials;  // OneToOne - Credenciales
  hosted_appointments: Appointment[];
  preferences: UserPreference[];
}
```

**Observaciones clave:**
- NO hay entidad de Roles o Permisos
- El único diferenciador de acceso es el campo `is_creator` (booleano)
- Todos los empleados están asociados a un `supplier_id`
- No hay roles como "admin", "manager", "employee", etc.

## 2. AUTENTICACIÓN Y TOKENIZACIÓN

### JWT Token Service
Ubicación: `/Users/estebancanales/Work/novack/backend/src/application/services/token.service.ts`

#### Payload del JWT generado:
```typescript
const jwtPayload = {
  sub: employee.id,                    // Subject (ID del empleado)
  email: employee.email,
  name: `${employee.first_name} ${employee.last_name}`,
  supplier_id: employee.supplier?.id || employee.supplier_id,
  is_creator: employee.is_creator,     // Flag clave incluido en el token
  jti: uuidv4(),                       // JWT ID único para cada token
  iat: Math.floor(Date.now() / 1000),  // Issued at
};
```

#### Características:
- Access token con expiración de **15 minutos**
- Se almacena información del supplier en el token
- El `is_creator` se incluye en el JWT para uso en guards y servicios
- No incluye información de roles explícita (solo el flag is_creator)

### JWT Strategy (Passport.js)
Ubicación: `/Users/estebancanales/Work/novack/backend/src/application/strategies/jwt.strategy.ts`

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      is_creator: payload.is_creator,    // Validación preserva el flag
      supplier_id: payload.supplier_id,
    };
  }
}
```

## 3. GUARDS DE AUTENTICACIÓN Y AUTORIZACIÓN

### 3.1 AuthGuard (Autenticación)
Ubicación: `/Users/estebancanales/Work/novack/backend/src/application/guards/auth.guard.ts`

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Verificar si ruta está marcada como @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 2. Extraer token del header Authorization: Bearer <token>
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token no proporcionado");
    }

    // 3. Validar token
    const token = authHeader.replace("Bearer ", "");
    const payload = await this.tokenService.validateToken(token);
    
    // 4. Guardar información del usuario en request
    request.user = payload;
    return true;
  }
}
```

**Propósito:** Verifica que el usuario esté autenticado (tenga un JWT válido)
**Aplicación:** Se aplica a nivel de controlador o método con `@UseGuards(AuthGuard)`

### 3.2 SupplierAccessGuard (Autorización por Supplier)
Ubicación: `/Users/estebancanales/Work/novack/backend/src/application/guards/supplier-access.guard.ts`

```typescript
@Injectable()
export class SupplierAccessGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Usuario no autenticado");
    }

    // Obtener supplier_id de parámetros o body
    const supplierId = request.params.supplierId || request.body.supplier_id;

    // Si no hay supplier_id en la request, solo verificar autenticación
    if (!supplierId) {
      return true;
    }

    // Si el usuario NO tiene supplier_id, permitir (es admin/super usuario)
    if (!user.supplier_id) {
      return true;
    }

    // Verificar que el supplier_id coincida
    if (user.supplier_id !== supplierId) {
      throw new ForbiddenException(
        "No tienes permiso para acceder a recursos de otro proveedor"
      );
    }

    return true;
  }
}
```

**Propósito:** Asegura que un usuario solo pueda acceder a recursos de su supplier
**Lógica:** 
- Usuario sin supplier_id = Admin/Super usuario (acceso a todo)
- Usuario con supplier_id = Solo accede a recursos de su supplier
- Se verifica que `user.supplier_id === supplierId` (parámetro de ruta)

### 3.3 WsJwtGuard (Autenticación WebSocket)
Ubicación: `/Users/estebancanales/Work/novack/backend/src/application/guards/ws-jwt.guard.ts`

```typescript
@Injectable()
export class WsJwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractTokenFromHeader(client);

    if (!token) {
      throw new WsException("Token no proporcionado");
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      const userType = payload.userType || "employee"; // Por defecto employee

      let user;
      if (userType === "employee") {
        user = await this.employeeRepository.findOne({
          where: { id: payload.sub },
          relations: ["supplier"],  // IMPORTANTE: Cargar supplier
        });
        if (!user) throw new WsException("Empleado no encontrado");
      } else {
        user = await this.visitorRepository.findOne({
          where: { id: payload.sub },
          relations: ["supplier"],  // IMPORTANTE: Cargar supplier
        });
        if (!user) throw new WsException("Visitante no encontrado");
      }

      // Guardar datos del usuario en el contexto
      wsContext.getData().user = {
        id: payload.sub,
        userType,
        ...user,
      };
      client["user"] = { id: payload.sub, userType, ...user };

      return true;
    } catch (e) {
      throw new WsException("Token inválido: " + e.message);
    }
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    return (
      client.handshake.query.token ||
      client.handshake.auth?.token ||
      client.handshake.headers.authorization?.split(" ")[1]
    );
  }
}
```

**Propósito:** Autentica usuarios en WebSocket (chat)
**Especial:** Carga la relación `supplier` del usuario (crítico para filtrar mensajes)

### 3.4 CustomThrottlerGuard (Rate Limiting)
Ubicación: `/Users/estebancanales/Work/novack/backend/src/application/guards/throttler.guard.ts`

```typescript
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip = req.ip || (req.headers["x-forwarded-for"]?.split(",")[0].trim() || "unknown");
    const path = req.route?.path || req.url;
    return `${ip}-${path}`;
  }
  
  protected errorMessage = "Demasiadas peticiones, intente más tarde";
}
```

**Propósito:** Prevenir ataques de fuerza bruta y DoS
**Configurado en app.module.ts con tres niveles:**
- `login`: 5 intentos/minuto (desarrollo: 1000)
- `api`: 50 requests/minuto (desarrollo: 1000)
- `default`: 100 requests/minuto (desarrollo: 1000)

## 4. DECORADORES

### 4.1 @Public() Decorator
Ubicación: `/Users/estebancanales/Work/novack/backend/src/application/decorators/public.decorator.ts`

```typescript
export const IS_PUBLIC_KEY = "isPublic";

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**Uso:** Marca rutas como públicas (sin autenticación requerida)

**Ejemplo:** Rutas de login, registro público, etc.

### 4.2 @AuditAccess() Decorator
Ubicación: `/Users/estebancanales/Work/novack/backend/src/application/decorators/audit-access.decorator.ts`

```typescript
export interface AuditInfo {
  user: { id: string; email?: string };
  action: string;              // READ, UPDATE, DELETE, etc.
  resourceType: string;         // Tipo de recurso
  resourceId: string;
  ipAddress: string;
  userAgent: string;
  additionalData?: Record<string, any>;
}

export const AuditAccess = (actionType: string, resourceType: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    // Intercepta llamadas a métodos, registra auditoría, llama método original
  };
};
```

**Propósito:** Registrar acceso a datos sensibles
**Información registrada:** User, action, resource type/id, IP, User-Agent

### 4.3 @WsAuthUser() Decorator
Ubicación: `/Users/estebancanales/Work/novack/backend/src/application/decorators/ws-auth-user.decorator.ts`

```typescript
export const WsAuthUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const wsContext = ctx.switchToWs();
    const client = wsContext.getClient();
    const user = client["user"] || wsContext.getData().user;

    if (!user) {
      throw new Error("Usuario no autenticado");
    }

    return user;
  },
);
```

**Uso:** Inyectar el usuario autenticado en handlers WebSocket

## 5. CONFIGURACIÓN DE GUARDS EN MÓDULOS

### AuthModule
Ubicación: `/Users/estebancanales/Work/novack/backend/src/application/modules/auth.module.ts`

```typescript
@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([Employee, EmployeeCredentials]),
    TokenModule,
    EmployeeModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SmsService,
    JwtStrategy,
    AuthenticateEmployeeUseCase,
    EmployeeRepository,
    { provide: "IEmployeeRepository", useClass: EmployeeRepository },
  ],
  exports: [JwtStrategy, AuthService],
})
export class AuthModule {}
```

### Configuración Global en AppModule
Ubicación: `/Users/estebancanales/Work/novack/backend/src/app.module.ts`

```typescript
// ThrottlerModule: Rate limiting
ThrottlerModule.forRoot([
  {
    name: "login",
    ttl: 60000,
    limit: process.env.NODE_ENV === 'development' ? 1000 : 5,
  },
  {
    name: "api",
    ttl: 60000,
    limit: process.env.NODE_ENV === 'development' ? 1000 : 50,
  },
  {
    name: "default",
    ttl: 60000,
    limit: process.env.NODE_ENV === 'development' ? 1000 : 100,
  },
]),

// JWT Module
JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    secret: configService.get("config.jwt.secret"),
    signOptions: { expiresIn: configService.get("config.jwt.expiresIn") },
  }),
}),
```

## 6. USO DE GUARDS EN CONTROLADORES

### Employee Controller
Ubicación: `/Users/estebancanales/Work/novack/backend/src/interface/controllers/employee.controller.ts`

```typescript
@Controller('employees')
export class EmployeeController {
  
  // Ruta pública (sin autenticación)
  @Post('public')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async createPublic(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeeService.createPublic(createEmployeeDto);
  }

  // Requiere autenticación
  @Get('me')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(@Req() req: any): Promise<any> {
    return this.employeeService.findOne(req.user.id);
  }

  // Requiere autenticación + Acceso al supplier específico
  @Get('supplier/:supplierId')
  @UseGuards(SupplierAccessGuard)
  @HttpCode(HttpStatus.OK)
  findBySupplier(@Param('supplierId', ParseUUIDPipe) supplierId: string) {
    return this.employeeService.findBySupplier(supplierId);
  }

  // Requiere autenticación
  @Get('search/contacts')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async searchContacts(
    @Query('q') query: string,
    @Req() req: any
  ) {
    // Solo retorna contactos del mismo supplier que el usuario
    const employees = await this.employeeService.findBySupplier(req.user.supplier_id);
    return employees.filter(emp => emp.id !== req.user.id);
  }
}
```

## 7. SERVICIO DE AUTENTICACIÓN

### AuthService
Ubicación: `/Users/estebancanales/Work/novack/backend/src/application/services/auth.service.ts`

#### Validación de empleado:
```typescript
async validateEmployee(email: string, password: string) {
  const employee = await this.employeeRepository.findOne({
    where: { email },
    relations: ["credentials", "supplier"],
  });

  if (!employee || !employee.credentials) {
    throw new UnauthorizedException("Credenciales inválidas");
  }

  const { credentials } = employee;

  // Verificar si la cuenta está bloqueada (después de 10 intentos fallidos)
  if (credentials.locked_until && credentials.locked_until > new Date()) {
    throw new UnauthorizedException("Cuenta bloqueada temporalmente");
  }

  // Verificar contraseña con bcrypt
  const isPasswordValid = await bcrypt.compare(password, credentials.password_hash);
  if (!isPasswordValid) {
    credentials.login_attempts += 1;
    
    // Bloquear cuenta si se excede el límite (10 intentos)
    if (credentials.login_attempts >= 10) {
      credentials.locked_until = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    }
    
    await this.employeeAuthRepository.save(credentials);
    throw new UnauthorizedException("Credenciales inválidas");
  }

  // Resetear intentos de login
  credentials.login_attempts = 0;
  // ... resto de validación
}
```

**Seguridad incluida:**
- Bloqueo de cuenta después de 10 intentos fallidos
- Bloqueo por 15 minutos
- Encriptación bcrypt de contraseñas

## 8. CREACIÓN DE CREADORES EN SUPPLIERS

### SupplierService
Ubicación: `/Users/estebancanales/Work/novack/backend/src/application/services/supplier.service.ts`

```typescript
async create(createSupplierDto: CreateSupplierDto) {
  // ... validaciones y crear supplier ...

  // Crear empleado creador
  if (createSupplierDto.supplier_creator) {
    const employee = await this.employeeService.create({
      first_name: createSupplierDto.supplier_creator.split(" ")[0] || "Admin",
      last_name: createSupplierDto.supplier_creator.split(" ").slice(1).join(" ") || "User",
      email: createSupplierDto.contact_email,
      password: temporalPassword,
      is_creator: true,  // FLAG CLAVE: Marcar como creador
      supplier_id: savedSupplier.id,
    });

    // Enviar email con credenciales
    await this.emailService.sendSupplierCreationEmail(
      savedSupplier,
      createSupplierDto.contact_email,
      temporalPassword,
    );
  }

  return this.findOne(savedSupplier.id);
}
```

**Flujo:**
1. Crear supplier
2. Crear empleado con `is_creator: true` asociado al supplier
3. Enviar email con credenciales temporales

## 9. ESTADO ACTUAL DEL SISTEMA DE PERMISOS

### Lo que EXISTE:
- ✅ Autenticación JWT (15 minutos)
- ✅ Flag `is_creator` (booleano) en Employee
- ✅ Aislamiento por `supplier_id` (AuthGuard + SupplierAccessGuard)
- ✅ Rate limiting (diferentes límites por ruta)
- ✅ Bloqueo de cuenta por intentos fallidos
- ✅ Auditoría de accesos (decorador)
- ✅ WebSocket con autenticación JWT
- ✅ Rutas públicas (@Public decorator)

### Lo que NO EXISTE:
- ❌ Entidad de Roles (Role entity)
- ❌ Entidad de Permisos (Permission entity)
- ❌ Sistema RBAC (Role-Based Access Control) completo
- ❌ Sistema de ACL (Access Control List)
- ❌ Permisos granulares por acción (READ, CREATE, UPDATE, DELETE)
- ❌ Hierarchía de roles (admin > manager > employee)
- ❌ Guards específicos para diferentes roles
- ❌ Decoradores como @RequireRole('admin') o @RequirePermission('edit:employees')

## 10. ARQUITECTURA ACTUAL DEL SISTEMA DE ACCESO

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE (Frontend)                    │
│                                                          │
│  Login: email + password                                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         ENDPOINT DE AUTENTICACIÓN                       │
│  POST /auth/login                                       │
│                                                          │
│  1. Validar credenciales (bcrypt)                       │
│  2. Generar JWT con payload:                            │
│     - id, email, name                                   │
│     - supplier_id                                       │
│     - is_creator                                        │
│  3. Retornar access_token (válido 15 min)              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│    CLIENTE GUARDA TOKEN EN LOCALSTORAGE/MEMORIA         │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Header: Authorization: Bearer <token>
                     ▼
┌─────────────────────────────────────────────────────────┐
│              SOLICITUD A ENDPOINT PROTEGIDO             │
│  GET /api/protected                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
            ┌────────────────────┐
            │   @UseGuards()     │
            │   AuthGuard        │
            └────────────────────┘
                     │
                     ├─ ¿Es @Public()? → SÍ: Pasar
                     │
                     ├─ ¿Token en header? → NO: UnauthorizedException
                     │
                     ├─ ¿Token válido? → NO: UnauthorizedException
                     │
                     └─ SÍ: Guardar payload en request.user → Pasar
                            │
                            ├─ request.user.id
                            ├─ request.user.supplier_id
                            ├─ request.user.is_creator
                            └─ request.user.email
                     │
                     ▼
            ┌────────────────────────────────┐
            │  @UseGuards()                  │
            │  SupplierAccessGuard (Opcional)│
            └────────────────────────────────┘
                     │
                     ├─ ¿Hay supplierId en request? → NO: Pasar
                     │
                     ├─ ¿Usuario sin supplier_id? → SÍ: Pasar (Admin)
                     │
                     ├─ ¿user.supplier_id == supplierId? → SÍ: Pasar
                     │
                     └─ NO: ForbiddenException
                     │
                     ▼
            ┌────────────────────────────────┐
            │   LÓGICA DEL CONTROLADOR       │
            │   (Puede acceder a request.user)
            └────────────────────────────────┘
```

## 11. MODELOS DE ENTIDADES RELACIONADAS

### Supplier Entity
- Creado por el primer empleado (`is_creator: true`)
- Múltiples empleados pueden pertenecer al mismo supplier
- Solo UN empleado por supplier tiene `is_creator: true`

### EmployeeCredentials Entity
```typescript
@Entity({ name: "employee_credentials" })
export class EmployeeCredentials {
  id: string;
  password_hash: string;
  login_attempts: number;
  locked_until?: Date;  // Bloqueo temporal
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
  
  employee: Employee;   // OneToOne
}
```

## 12. RESUMEN: CÓMO FUNCIONA ACTUALMENTE

1. **Autenticación:** JWT + bcrypt, 15 min de validez
2. **Token contiene:** ID, email, supplier_id, is_creator
3. **Autorización nivel 1:** AuthGuard verifica JWT válido
4. **Autorización nivel 2:** SupplierAccessGuard verifica supplier_id
5. **Identificador único de rol:** Flag `is_creator` (booleano)
6. **Aislamiento de datos:** Por supplier_id (empleados no ven a otros suppliers)
7. **Seguridad:**
   - Rate limiting
   - Bloqueo por intentos fallidos (10 intentos, 15 minutos)
   - Auditoría de accesos
   - CSRF protection (módulo instalado)
   - Data masking (interceptor disponible pero desactivado)

## 13. LIMITACIONES Y CONSIDERACIONES

- **Sin roles explícitos:** Solo `is_creator` vs rest
- **Sin permisos granulares:** No hay control READ/CREATE/UPDATE/DELETE
- **Sin delegación de permisos:** Un creador no puede dar permisos a otros
- **Escala limitada:** Difícil de mantener con muchos tipos de usuarios
- **Falta hierarchía:** No hay diferencia entre un admin regular y superadmin

## 14. PROPUESTA DE MEJORA (si fuera necesaria)

Para implementar un sistema RBAC completo:

1. Crear entidad `Role` (enum o tabla)
2. Crear entidad `Permission` (tabla)
3. Crear relación ManyToMany `Role-Permission`
4. Agregar foreign key `role_id` a Employee
5. Crear decorator `@RequireRole('admin')`
6. Crear decorator `@RequirePermission('read:employees')`
7. Reemplazar lógica de `is_creator` con roles

