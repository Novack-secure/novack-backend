import { ApiPropertyOptional } from "@nestjs/swagger";
import {
	IsString,
	IsEmail,
	IsUUID,
	IsOptional,
	IsDate,
	IsObject,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdateVisitorDto {
	@ApiPropertyOptional({
		description: "Nombre del visitante",
		example: "Ana García",
	})
	@IsString()
	@IsOptional()
	name?: string;

	@ApiPropertyOptional({
		description: "Email del visitante",
		example: "ana.garcia@example.com",
	})
	@IsEmail()
	@IsOptional()
	email?: string;

	@ApiPropertyOptional({
		description: "Teléfono del visitante",
		example: "+34 555 123 456",
	})
	@IsString()
	@IsOptional()
	phone?: string;

	@ApiPropertyOptional({
		description: "Ubicación o área que visitará",
		example: "Oficina Central - Piso 3",
	})
	@IsString()
	@IsOptional()
	location?: string;

	@ApiPropertyOptional({
		description: "Estado del visitante (pendiente, en_progreso, completado)",
		example: "en_progreso",
		enum: ["pendiente", "en_progreso", "completado"],
	})
	@IsString()
	@IsOptional()
	state?: string;

	@ApiPropertyOptional({
		description: "ID del proveedor",
		example: "123e4567-e89b-12d3-a456-426614174000",
	})
	@IsUUID()
	@IsOptional()
	supplier_id?: string;

	@ApiPropertyOptional({
		description: "Título de la cita",
		example: "Reunión de presentación",
	})
	@IsString()
	@IsOptional()
	appointment?: string;

	@ApiPropertyOptional({
		description: "Descripción de la cita",
		example: "Presentación de nuevos productos",
	})
	@IsString()
	@IsOptional()
	appointment_description?: string;

	@ApiPropertyOptional({
		description: "Fecha y hora de entrada",
		example: "2025-05-20T10:00:00Z",
	})
	@IsDate()
	@Type(() => Date)
	@IsOptional()
	check_in_time?: Date;

	@ApiPropertyOptional({
		description: "Fecha y hora de salida",
		example: "2025-05-20T12:00:00Z",
	})
	@IsDate()
	@Type(() => Date)
	@IsOptional()
	check_out_time?: Date;

	@ApiPropertyOptional({
		description: "Quejas o comentarios",
		example: { invitado1: "Ninguno" },
	})
	@IsObject()
	@IsOptional()
	complaints?: Record<string, string>;
}
