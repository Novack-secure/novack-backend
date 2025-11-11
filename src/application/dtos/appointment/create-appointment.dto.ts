import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsDateString, IsUUID } from "class-validator";

export class CreateAppointmentDto {
	@ApiProperty({ description: "Título de la cita" })
	@IsString()
	title: string;

	@ApiPropertyOptional({ description: "Descripción de la cita" })
	@IsString()
	@IsOptional()
	description?: string;

	@ApiProperty({ description: "Fecha y hora programada", example: "2025-10-26T10:00:00Z" })
	@IsDateString()
	scheduled_time: string;

	@ApiPropertyOptional({ description: "Ubicación de la cita" })
	@IsString()
	@IsOptional()
	location?: string;

	@ApiProperty({ description: "ID del visitante" })
	@IsUUID()
	visitor_id: string;

	@ApiPropertyOptional({ description: "ID del empleado anfitrión" })
	@IsUUID()
	@IsOptional()
	host_employee_id?: string;

	@ApiPropertyOptional({ description: "ID del proveedor" })
	@IsUUID()
	@IsOptional()
	supplier_id?: string;
}
