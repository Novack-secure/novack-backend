const jwt = require('jsonwebtoken');

// Configuración del token
const JWT_SECRET = 'test_token';
const JWT_EXPIRATION = '24h';

// Payload con datos mock de un usuario
const payload = {
  sub: '12345678-1234-1234-1234-123456789012', // ID de usuario simulado 
  email: 'admin@example.com',
  name: 'Admin Usuario',
  supplier_id: '87654321-4321-4321-4321-210987654321', // ID de proveedor simulado
  is_creator: true,
  jti: '98765432-9876-9876-9876-987654321098', // JWT ID único
  iat: Math.floor(Date.now() / 1000),
};

// Generar el token
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

// Imprimir el token
console.log('JWT Token:');
console.log(token);

// Imprimir comandos curl para usar el token
console.log('\nComando curl para crear un supplier:');
console.log(`curl -X POST http://localhost:3000/suppliers \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "supplier_name": "Nuevo Proveedor",
    "supplier_creator": "Admin Usuario",
    "contact_email": "contacto@nuevoproveedor.com",
    "phone_number": "987654321",
    "address": "Av. Principal 123, Lima",
    "description": "Empresa de tecnología especializada en servicios de seguridad",
    "logo_url": "https://example.com/logo.png",
    "additional_info": {"sector": "tecnología", "años_experiencia": 10},
    "is_subscribed": true,
    "has_card_subscription": true,
    "has_sensor_subscription": false,
    "employee_count": 25,
    "card_count": 10
  }'`); 