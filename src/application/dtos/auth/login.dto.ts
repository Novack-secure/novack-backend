import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'empleado@empresa.com',
    description: 'Email del empleado',
  })
  @IsEmail({}, { message: 'El email debe ser válido' })
  email: string;

  @ApiProperty({
    example: 'Contraseña123',
    description: 'Contraseña del empleado',
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;
}

// New DTO for SMS OTP verification during login
import { IsNotEmpty, IsUUID, Length } from 'class-validator';

export class LoginSmsVerifyDto {
  @ApiProperty({
    description: 'User ID of the user attempting to verify SMS OTP',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty({ message: 'User ID cannot be empty' })
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  userId: string;

  @ApiProperty({
    example: '123456',
    description: 'The 6-digit OTP code sent via SMS',
  })
  @IsNotEmpty({ message: 'OTP code cannot be empty' })
  @IsString()
  @Length(6, 6, { message: 'OTP code must be 6 digits' })
  otp: string;
}
