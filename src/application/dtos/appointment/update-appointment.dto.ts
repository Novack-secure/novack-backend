import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsDateString, IsUUID, IsIn } from "class-validator";

export class UpdateAppointmentDto {
	@ApiPropertyOptional({ description: "Título de la cita" })
	@IsString()
	@IsOptional()
	title?: string;

	@ApiPropertyOptional({ description: "Descripción de la cita" })
	@IsString()
	@IsOptional()
	description?: string;

	@ApiPropertyOptional({ description: "Fecha y hora programada" })
	@IsDateString()
	@IsOptional()
	scheduled_time?: string;

	@ApiPropertyOptional({ description: "Ubicación de la cita" })
	@IsString()
	@IsOptional()
	location?: string;

	@ApiPropertyOptional({ description: "Estado de la cita", enum: ["pendiente", "en_progreso", "completado", "cancelado"] })
	@IsIn(["pendiente", "en_progreso", "completado", "cancelado"])
	@IsOptional()
	status?: string;

	@ApiPropertyOptional({ description: "ID del empleado anfitrión" })
	@IsUUID()
	@IsOptional()
	host_employee_id?: string;

	@ApiPropertyOptional({ description: "Tiempo de check-in" })
	@IsDateString()
	@IsOptional()
	check_in_time?: string;

	@ApiPropertyOptional({ description: "Tiempo de check-out" })
	@IsDateString()
	@IsOptional()
	check_out_time?: string;
}
