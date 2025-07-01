import {
  IsString,
  IsNotEmpty,
  Length,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2FADto {
  @ApiProperty({
    description:
      'Código de verificación proporcionado por la app o enviado por correo',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

export class Verify2FADto {
  @ApiProperty({
    description:
      'Código de verificación proporcionado por la app o enviado por correo',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

export class Disable2FADto {
  @ApiProperty({
    description:
      'Código de verificación proporcionado por la app o enviado por correo',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

export class RecoveryCodeDto {
  @ApiProperty({
    description: 'Código de recuperación para acceder sin 2FA',
    example: 'ABCD-1234-EFGH-5678',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}

// Alias de RecoveryCodeDto para mantener compatibilidad con el código existente
export class BackupCodeDto {
  @ApiProperty({
    description:
      'Código de respaldo para casos de emergencia cuando no se puede usar 2FA',
    example: 'Z45PJK8SD3',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(12)
  code: string;
}

// --- DTOs for SMS Based Two-Factor Authentication ---

import { IsPhoneNumber } from 'class-validator'; // Ensure IsPhoneNumber is imported

export class InitiateSmsVerificationDto {
  @ApiProperty({
    example: '+11234567890',
    description:
      'Phone number in E.164 format for SMS 2FA setup. Example: + followed by country code and number.',
  })
  @IsNotEmpty({ message: 'Phone number cannot be empty' })
  @IsString()
  // Note: @IsPhoneNumber decorator often requires a region code (e.g. @IsPhoneNumber('US'))
  // or can be left as null to validate against general E.164 format.
  // Ensure your validation pipe handles this correctly.
  @IsPhoneNumber(null, {
    message:
      'Invalid phone number format. Use E.164 format (e.g., +12223334444).',
  })
  phone_number: string;
}

export class VerifySmsOtpDto {
  @ApiProperty({
    example: '123456',
    description: 'The 6-digit OTP code sent via SMS',
  })
  @IsNotEmpty({ message: 'OTP code cannot be empty' })
  @IsString()
  @Length(6, 6, { message: 'OTP code must be 6 digits' })
  otp: string;
}
