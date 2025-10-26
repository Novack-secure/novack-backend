# Instrucciones para Resetear y Cargar Datos de Prueba

## Pasos para resetear la base de datos y cargar el seed

### 1. **Detener el servidor backend**
```bash
# Si está corriendo, detenerlo con Ctrl+C
```

### 2. **Resetear las tablas de la base de datos**

Opción A - Usando el script SQL (recomendado):
```bash
# Desde el directorio backend
psql -h localhost -U tu_usuario -d tu_database -f ../fix-employee-supplier.sql
```

Opción B - Manualmente en psql:
```sql
-- Conectarse a la base de datos
psql -h localhost -U tu_usuario -d tu_database

-- Eliminar datos
SET session_replication_role = replica;
TRUNCATE TABLE "employee_credentials" CASCADE;
TRUNCATE TABLE "employees" CASCADE;
TRUNCATE TABLE "suppliers" CASCADE;
TRUNCATE TABLE "chat_messages" CASCADE;
TRUNCATE TABLE "chat_room_employees" CASCADE;
TRUNCATE TABLE "chat_room_visitors" CASCADE;
TRUNCATE TABLE "chat_rooms" CASCADE;
SET session_replication_role = DEFAULT;
```

### 3. **Ejecutar el seed**

```bash
cd backend
npm run seed
# o
npx ts-node scripts/seed-database.ts
```

### 4. **Verificar los datos cargados**

```sql
-- Verificar suppliers
SELECT id, supplier_name, contact_email FROM suppliers;

-- Verificar empleados con sus suppliers
SELECT 
    e.id, 
    e.first_name, 
    e.last_name, 
    e.email,
    e.supplier_id,
    s.supplier_name
FROM employees e
LEFT JOIN suppliers s ON s.id = e.supplier_id
ORDER BY s.supplier_name, e.is_creator DESC, e.first_name;

-- Contar empleados por supplier
SELECT 
    s.supplier_name,
    COUNT(e.id) as total_empleados
FROM suppliers s
LEFT JOIN employees e ON e.supplier_id = s.id
GROUP BY s.id, s.supplier_name
ORDER BY s.supplier_name;
```

### 5. **Iniciar el servidor backend**

```bash
cd backend
npm run start:dev
```

### 6. **Hacer logout y login en el frontend**

Para que el usuario se cargue correctamente con el supplier:

1. Ir a la aplicación frontend
2. Hacer logout
3. Hacer login con uno de los usuarios del seed (ver SEED_DATA.md)
4. Verificar que el chat ahora muestra los usuarios correctamente

## Usuarios de Prueba

### SecureNet Systems (Supplier 3)
```
Email: roberto.fernandez@securenet.cr
Password: SecureNet2024!
Rol: CEO (Creador)

Email: gabriela.murillo@securenet.cr
Password: Gabriela2024!
Rol: Gerente de Seguridad

Email: fernando.quiros@securenet.cr
Password: Fernando2024!
Rol: Arquitecto de Soluciones

Email: alejandra.campos@securenet.cr
Password: Alejandra2024!
Rol: Consultora de Ciberseguridad
```

### TechCorp Solutions (Supplier 1)
```
Email: carlos.ramirez@techcorp.cr
Password: TechCorp2024!
Rol: CEO (Creador)

Email: laura.jimenez@techcorp.cr
Password: Laura2024!
Rol: Gerente de Operaciones

Email: diego.solis@techcorp.cr
Password: Diego2024!
Rol: Desarrollador Senior

Email: patricia.mendoza@techcorp.cr
Password: Patricia2024!
Rol: Analista de Seguridad
```

## Verificación del Chat

Después de hacer login con un usuario (ej: roberto.fernandez@securenet.cr):

1. **Ir a la página de Chat** (`/chat`)
2. **Hacer clic en el botón de Usuarios** (icono de Users)
3. **Deberías ver**:
   - Gabriela Murillo
   - Fernando Quirós
   - Alejandra Campos
   
   (Solo los empleados del mismo supplier, excluyendo al usuario actual)

4. **Hacer clic en un usuario** para crear/abrir chat privado
5. **Enviar mensajes** y verificar que funcionan correctamente

## Cambios Realizados en el Backend

### 1. **Entidad Employee** (`employee.entity.ts`)
```typescript
@ManyToOne(
    () => Supplier,
    (supplier) => supplier.employees,
    { nullable: true }
)
@JoinColumn({ name: "supplier_id" })
supplier: Supplier;

@Column({ nullable: true })
supplier_id: string;
```

### 2. **WsJwtGuard** (`ws-jwt.guard.ts`)
- Agregado `relations: ["supplier"]` para cargar el supplier en el WebSocket

### 3. **Seed Database** (`seed-database.ts`)
- Corregido para asignar `supplier: supplier` en lugar de solo `supplier_id`

### 4. **WebSocket Service Frontend** (`websocket.service.ts`)
- Mejorado manejo de respuestas para extraer correctamente `rooms`, `messages`, etc.

### 5. **useAuth Hook** (`useAuth.tsx`)
- Agregado auto-recuperación del supplier si falta en localStorage

## Solución de Problemas

### El chat no muestra usuarios
1. Verificar que el usuario tiene `supplier_id` asignado:
   ```sql
   SELECT email, supplier_id FROM employees WHERE email = 'tu_email@ejemplo.com';
   ```

2. Verificar que hay otros empleados en el mismo supplier:
   ```sql
   SELECT email FROM employees WHERE supplier_id = 'tu_supplier_id';
   ```

3. Verificar en la consola del navegador:
   - Debe mostrar "WebSocket conectado"
   - No debe haber errores en `getUserRooms`

### Error "Usuario sin supplier asignado"
1. Hacer logout
2. Ejecutar seed nuevamente
3. Hacer login nuevamente

### La búsqueda de contactos retorna 0 empleados
1. Verificar el supplier_id del usuario en el JWT coincide con la BD
2. Ejecutar:
   ```sql
   SELECT * FROM employees WHERE supplier_id = 'supplier_id_del_jwt';
   ```
