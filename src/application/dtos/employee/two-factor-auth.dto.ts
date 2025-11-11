import {
	IsString,
	IsNotEmpty,
	Length,
	MinLength,
	MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class Enable2FADto {
	@ApiProperty({
		description:
			"Código de verificación proporcionado por la app o enviado por correo",
		example: "123456",
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
			"Código de verificación proporcionado por la app o enviado por correo",
		example: "123456",
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
			"Código de verificación proporcionado por la app o enviado por correo",
		example: "123456",
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
		description: "Código de recuperación para acceder sin 2FA",
		example: "ABCD-1234-EFGH-5678",
	})
	@IsString()
	@IsNotEmpty()
	code: string;
}

// Alias de RecoveryCodeDto para mantener compatibilidad con el código existente
export class BackupCodeDto {
	@ApiProperty({
		description:
			"Código de respaldo para casos de emergencia cuando no se puede usar 2FA",
		example: "Z45PJK8SD3",
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(8)
	@MaxLength(12)
	code: string;
}

// --- DTOs for SMS Based Two-Factor Authentication ---

import { IsPhoneNumber, IsUUID, IsEmail, IsOptional } from "class-validator"; // Ensure IsPhoneNumber is imported

export class InitiateSmsVerificationDto {
	@ApiProperty({
		example: "+11234567890",
		description:
			"Phone number in E.164 format for SMS 2FA setup. Example: + followed by country code and number.",
	})
	@IsNotEmpty({ message: "Phone number cannot be empty" })
	@IsString()
	// Note: @IsPhoneNumber decorator often requires a region code (e.g. @IsPhoneNumber('US'))
	// or can be left as null to validate against general E.164 format.
	// Ensure your validation pipe handles this correctly.
	@IsPhoneNumber(null, {
		message:
			"Invalid phone number format. Use E.164 format (e.g., +12223334444).",
	})
	phone_number: string;
}

export class VerifySmsOtpDto {
	@ApiProperty({
		example: "123456",
		description: "The 6-digit OTP code sent via SMS",
	})
	@IsNotEmpty({ message: "OTP code cannot be empty" })
	@IsString()
	@Length(6, 6, { message: "OTP code must be 6 digits" })
	otp: string;
}

// Public registration SMS DTOs
export class InitiateSmsVerificationPublicDto {
  @ApiProperty({ description: "Employee ID (UUID v4)", example: "123e4567-e89b-12d3-a456-426614174000", required: false })
  @IsUUID()
  @IsOptional()
  employee_id?: string;

  @ApiProperty({ description: "Employee email (alternative to ID)", example: "user@example.com", required: false })
  @IsEmail()
  @IsOptional()
  employee_email?: string;

  @ApiProperty({ description: "Phone number in E.164 format", example: "+50688888888" })
  @IsNotEmpty()
  @IsString()
  @IsPhoneNumber(null, { message: "Invalid phone number format. Use E.164 format." })
  phone_number: string;
}

export class VerifySmsOtpPublicDto {
  @ApiProperty({ description: "Employee ID (UUID v4)", example: "123e4567-e89b-12d3-a456-426614174000", required: false })
  @IsUUID()
  @IsOptional()
  employee_id?: string;

  @ApiProperty({ description: "Employee email (alternative to ID)", example: "user@example.com", required: false })
  @IsEmail()
  @IsOptional()
  employee_email?: string;

  @ApiProperty({ description: "6-digit OTP code", example: "123456" })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otp: string;
}

// Public registration EMAIL DTOs
export class InitiateEmailVerificationPublicDto {
  @ApiProperty({ description: "Employee email para iniciar verificación por email", example: "user@example.com" })
  @IsEmail()
  @IsNotEmpty()
  employee_email: string;

  @ApiProperty({ description: "Idioma preferido para el correo ('es' o 'en')", required: false, example: "es" })
  @IsOptional()
  @IsString()
  locale?: "es" | "en";
}

export class VerifyEmailOtpPublicDto {
  @ApiProperty({ description: "Employee email para verificar OTP", example: "user@example.com" })
  @IsEmail()
  @IsNotEmpty()
  employee_email: string;

  @ApiProperty({ description: "Código OTP de 6 dígitos enviado por email", example: "123456" })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  otp: string;
}
