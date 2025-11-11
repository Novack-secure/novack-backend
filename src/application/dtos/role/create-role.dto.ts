import {
	IsString,
	IsUUID,
	IsNotEmpty,
	IsBoolean,
	IsOptional,
	IsNumber,
	Min,
	IsArray,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateRoleDto {
	@ApiProperty({
		description: "Nombre del rol",
		example: "Manager",
	})
	@IsString()
	@IsNotEmpty({ message: "El nombre del rol es requerido" })
	name: string;

	@ApiPropertyOptional({
		description: "Descripción del rol",
		example: "Puede gestionar empleados y ver reportes",
	})
	@IsString()
	@IsOptional()
	description?: string;

	@ApiPropertyOptional({
		description: "Indica si es un rol del sistema (no se puede eliminar)",
		example: false,
		default: false,
	})
	@IsBoolean()
	@IsOptional()
	is_system_role?: boolean;

	@ApiPropertyOptional({
		description: "Prioridad del rol (mayor número = mayor prioridad)",
		example: 5,
		default: 1,
	})
	@IsNumber()
	@Min(1)
	@IsOptional()
	priority?: number;

	@ApiPropertyOptional({
		description: "ID del supplier al que pertenece el rol (multi-tenancy)",
		example: "123e4567-e89b-12d3-a456-426614174000",
	})
	@IsUUID()
	@IsOptional()
	supplier_id?: string;

	@ApiPropertyOptional({
		description: "IDs de los permisos a asignar al rol",
		example: [
			"123e4567-e89b-12d3-a456-426614174000",
			"223e4567-e89b-12d3-a456-426614174001",
		],
		type: [String],
	})
	@IsArray()
	@IsUUID("4", { each: true })
	@IsOptional()
	permission_ids?: string[];
}
