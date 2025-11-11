import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LogoutDto {
	@ApiProperty({
		example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
		description: "Token de refresco a invalidar",
	})
	@IsString({ message: "El token de refresco debe ser una cadena de texto" })
	@IsNotEmpty({ message: "El token de refresco es obligatorio" })
	refresh_token: string;
}
