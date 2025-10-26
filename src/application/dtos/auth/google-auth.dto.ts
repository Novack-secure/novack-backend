import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class GoogleAuthDto {
  @ApiProperty({
    description: "Email del usuario de Google",
    example: "usuario@gmail.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Nombre completo del usuario",
    example: "Juan Pérez",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "ID de Google del usuario",
    example: "1234567890",
  })
  @IsString()
  @IsNotEmpty()
  googleId: string;

  @ApiProperty({
    description: "URL de la imagen de perfil de Google",
    example: "https://lh3.googleusercontent.com/a/...",
    required: false,
  })
  @IsString()
  @IsOptional()
  image?: string;
}