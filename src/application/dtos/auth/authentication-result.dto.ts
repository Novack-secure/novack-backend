import { ApiProperty } from "@nestjs/swagger";
import { EmployeeBasicDto } from "src/application/dtos/employee/employee-basic.dto"; // Corregida la ruta sin extensión .ts

export class AuthenticationResultDto {
	@ApiProperty({
		example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
		description: "JWT Access Token",
	})
	access_token: string;

	@ApiProperty({ example: "djP8XVjNXZx...", description: "JWT Refresh Token" })
	refresh_token: string;

	@ApiProperty({
		example: 900,
		description: "Access token validity period in seconds",
	})
	expires_in: number;

	@ApiProperty({ example: "Bearer", description: "Token type" })
	token_type: string;

	@ApiProperty({
		type: () => EmployeeBasicDto,
		description: "Basic information of the authenticated employee",
		required: false,
	})
	employee?: EmployeeBasicDto; // Employee info might not be returned on refresh token responses
}
