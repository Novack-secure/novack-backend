import { IsEmail, IsString, MinLength, IsNotEmpty, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
	@ApiProperty({
		example: "empleado@empresa.com",
		description: "Email del empleado",
	})
	@IsEmail({}, { message: "El email debe ser válido" })
	email: string;

	@ApiProperty({
		example: "Contraseña123",
		description: "Contraseña del empleado",
	})
	@IsString()
	@MinLength(8, { message: "La contraseña debe tener al menos 8 caracteres" })
	password: string;
}

// New DTO for SMS OTP verification during login

export class LoginSmsVerifyDto {
	@ApiProperty({
		description: "Email of the user attempting to verify SMS OTP",
		example: "empleado@empresa.com",
	})
	@IsNotEmpty({ message: "Email cannot be empty" })
	@IsEmail({}, { message: "Email must be valid" })
	email: string;

	@ApiProperty({
		example: "123456",
		description: "The 6-digit OTP code sent via SMS",
	})
	@IsNotEmpty({ message: "OTP code cannot be empty" })
	@IsString()
	@Length(6, 6, { message: "OTP code must be 6 digits" })
	sms_otp_code: string;
}
