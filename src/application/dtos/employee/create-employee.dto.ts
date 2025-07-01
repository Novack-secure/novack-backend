import {
  IsString,
  IsEmail,
  IsUUID,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'Nombre del empleado',
    example: 'Juan',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  first_name: string;

  @ApiProperty({
    description: 'Apellidos del empleado',
    example: 'Pérez García',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Los apellidos son requeridos' })
  last_name: string;

  @ApiProperty({
    description: 'Correo electrónico del empleado (único)',
    example: 'juan.perez@empresa.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'El correo electrónico debe ser válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @ApiProperty({
    description: 'Contraseña del empleado (mínimo 6 caracteres)',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiPropertyOptional({
    description: 'Indica si el empleado es el creador del proveedor',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  is_creator?: boolean;

  @ApiProperty({
    description: 'ID UUID del proveedor al que pertenece el empleado',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty({ message: 'El ID del proveedor es requerido' })
  supplier_id: string;

  @ApiPropertyOptional({
    description: 'Número de teléfono del empleado',
    example: '+34 600 123 456',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Cargo o posición del empleado en la empresa',
    example: 'Gerente de Ventas',
  })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiPropertyOptional({
    description: 'Departamento al que pertenece el empleado',
    example: 'Ventas',
  })
  @IsString()
  @IsOptional()
  department?: string;
}
