import {
  IsString,
  IsEmail,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  Matches,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({
    description: 'Nombre del proveedor',
    example: 'Empresa ABC',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  supplier_name: string;

  @ApiProperty({
    description:
      'Nombre del empleado que crea el proveedor (será registrado como creador)',
    example: 'Juan Pérez',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  supplier_creator: string;

  @ApiProperty({
    description: 'Correo electrónico de contacto del proveedor',
    example: 'contacto@empresa.com',
    format: 'email',
  })
  @IsEmail()
  contact_email: string;

  @ApiProperty({
    description: 'Número de teléfono del proveedor (9 dígitos)',
    example: '987654321',
    pattern: '^[0-9]{9}$',
  })
  @IsString()
  @Matches(/^[0-9]{9}$/, { message: 'El teléfono debe tener 9 dígitos' })
  phone_number: string;

  @ApiProperty({
    description: 'Dirección física del proveedor',
    example: 'Av. Principal 123, Lima',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  address: string;

  @ApiProperty({
    description: 'Descripción general del proveedor',
    example: 'Empresa dedicada a servicios tecnológicos',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'URL del logo del proveedor',
    example: 'https://empresa.com/logo.png',
    format: 'uri',
  })
  @IsString()
  logo_url: string;

  @ApiPropertyOptional({
    description: 'Información adicional del proveedor (objeto JSON)',
    example: { clave: 'valor', otra_clave: 123 },
    type: 'object',
    additionalProperties: true,
    default: {},
  })
  @IsObject()
  @IsOptional()
  additional_info?: Record<string, any>;

  @ApiProperty({
    description: 'Indica si el proveedor tiene una suscripción activa',
    example: true,
    default: false,
  })
  @IsBoolean()
  is_subscribed: boolean;

  @ApiProperty({
    description: 'Indica si el proveedor tiene suscripción de tarjetas',
    example: true,
    default: false,
  })
  @IsBoolean()
  has_card_subscription: boolean;

  @ApiProperty({
    description: 'Indica si el proveedor tiene suscripción de sensores',
    example: false,
    default: false,
  })
  @IsBoolean()
  has_sensor_subscription: boolean;

  @ApiProperty({
    description: 'Número de empleados del proveedor',
    example: 5,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  employee_count: number;

  @ApiProperty({
    description: 'Número de tarjetas asignadas al proveedor',
    example: 3,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  card_count: number;
}
