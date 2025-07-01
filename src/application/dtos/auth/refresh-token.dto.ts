import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RefreshTokenDto {
	@ApiProperty({
		example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
		description: "Token de refresco para renovar el token de acceso",
	})
	@IsString({ message: "El token de refresco debe ser una cadena de texto" })
	@IsNotEmpty({ message: "El token de refresco es obligatorio" })
	refresh_token: string;
}
