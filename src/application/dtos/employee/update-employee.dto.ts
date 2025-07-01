import {
  IsString,
  IsEmail,
  IsUUID,
  IsBoolean,
  IsOptional,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({
    description: 'Nombre del empleado',
    example: 'Juan',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  first_name?: string;

  @ApiPropertyOptional({
    description: 'Apellidos del empleado',
    example: 'Pérez García',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  last_name?: string;

  @ApiPropertyOptional({
    description: 'Correo electrónico del empleado (único)',
    example: 'juan.perez@empresa.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'El correo electrónico debe ser válido' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Nueva contraseña del empleado (mínimo 6 caracteres)',
    example: 'newpassword123',
    minLength: 6,
  })
  @IsString()
  @IsOptional()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;

  @ApiPropertyOptional({
    description: 'Indica si el empleado es el creador del proveedor',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  is_creator?: boolean;

  @ApiPropertyOptional({
    description: 'ID UUID del proveedor al que pertenece el empleado',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  supplier_id?: string;

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
