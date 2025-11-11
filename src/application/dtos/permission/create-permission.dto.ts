import { IsString, IsNotEmpty, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePermissionDto {
	@ApiProperty({
		description:
			"Nombre único del permiso (formato: resource.action)",
		example: "employees.read",
	})
	@IsString()
	@IsNotEmpty({ message: "El nombre del permiso es requerido" })
	name: string;

	@ApiProperty({
		description: "Recurso sobre el que aplica el permiso",
		example: "employees",
	})
	@IsString()
	@IsNotEmpty({ message: "El recurso es requerido" })
	resource: string;

	@ApiProperty({
		description: "Acción que se permite realizar",
		example: "read",
	})
	@IsString()
	@IsNotEmpty({ message: "La acción es requerida" })
	action: string;

	@ApiPropertyOptional({
		description: "Descripción del permiso",
		example: "Permite ver la lista de empleados",
	})
	@IsString()
	@IsOptional()
	description?: string;
}
