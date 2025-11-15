import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Body,
	Param,
	Query,
	UseGuards,
	Patch,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { AppointmentService } from "src/application/services/appointment.service";
import { CreateAppointmentDto } from "src/application/dtos/appointment/create-appointment.dto";
import { UpdateAppointmentDto } from "src/application/dtos/appointment/update-appointment.dto";
import { AuthGuard } from "src/application/guards/auth.guard";

@ApiTags("Appointments")
@Controller("appointments")
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class AppointmentController {
	constructor(private readonly appointmentService: AppointmentService) {}

	@Post()
	@ApiOperation({ summary: "Crear una nueva cita" })
	@ApiResponse({ status: 201, description: "Cita creada exitosamente" })
	@ApiResponse({ status: 404, description: "Visitante o empleado no encontrado" })
	async create(@Body() createDto: CreateAppointmentDto) {
		return this.appointmentService.create(createDto);
	}

	@Get()
	@ApiOperation({ summary: "Obtener todas las citas" })
	@ApiQuery({ name: "supplierId", required: false, description: "Filtrar por proveedor" })
	@ApiResponse({ status: 200, description: "Lista de citas" })
	async findAll(@Query("supplierId") supplierId?: string) {
		return this.appointmentService.findAll(supplierId);
	}

	@Get("archived")
	@ApiOperation({ summary: "Obtener todas las citas archivadas" })
	@ApiQuery({ name: "supplierId", required: false, description: "Filtrar por proveedor" })
	@ApiResponse({ status: 200, description: "Lista de citas archivadas" })
	async findArchived(@Query("supplierId") supplierId?: string) {
		return this.appointmentService.findArchived(supplierId);
	}

	@Get("upcoming")
	@ApiOperation({ summary: "Obtener citas próximas" })
	@ApiQuery({ name: "limit", required: false, description: "Límite de resultados", type: Number })
	@ApiQuery({ name: "supplierId", required: false, description: "Filtrar por proveedor" })
	@ApiResponse({ status: 200, description: "Lista de citas próximas" })
	async findUpcoming(
		@Query("limit") limit?: number,
		@Query("supplierId") supplierId?: string,
	) {
		return this.appointmentService.findUpcoming(limit || 10, supplierId);
	}

	@Get("date-range")
	@ApiOperation({ summary: "Obtener citas por rango de fechas" })
	@ApiQuery({ name: "startDate", required: true, description: "Fecha de inicio (ISO 8601)" })
	@ApiQuery({ name: "endDate", required: true, description: "Fecha de fin (ISO 8601)" })
	@ApiQuery({ name: "supplierId", required: false, description: "Filtrar por proveedor" })
	@ApiResponse({ status: 200, description: "Lista de citas en el rango" })
	async findByDateRange(
		@Query("startDate") startDate: string,
		@Query("endDate") endDate: string,
		@Query("supplierId") supplierId?: string,
	) {
		return this.appointmentService.findByDateRange(
			new Date(startDate),
			new Date(endDate),
			supplierId,
		);
	}

	@Get(":id")
	@ApiOperation({ summary: "Obtener una cita por ID" })
	@ApiResponse({ status: 200, description: "Cita encontrada" })
	@ApiResponse({ status: 404, description: "Cita no encontrada" })
	async findOne(@Param("id") id: string) {
		return this.appointmentService.findOne(id);
	}

	@Put(":id")
	@ApiOperation({ summary: "Actualizar una cita" })
	@ApiResponse({ status: 200, description: "Cita actualizada exitosamente" })
	@ApiResponse({ status: 404, description: "Cita no encontrada" })
	async update(@Param("id") id: string, @Body() updateDto: UpdateAppointmentDto) {
		return this.appointmentService.update(id, updateDto);
	}

	@Patch(":id/check-in")
	@ApiOperation({ summary: "Hacer check-in en una cita" })
	@ApiResponse({ status: 200, description: "Check-in realizado exitosamente" })
	@ApiResponse({ status: 400, description: "Estado de cita inválido para check-in" })
	@ApiResponse({ status: 404, description: "Cita no encontrada" })
	async checkIn(@Param("id") id: string) {
		return this.appointmentService.checkIn(id);
	}

	@Patch(":id/check-out")
	@ApiOperation({ summary: "Hacer check-out en una cita" })
	@ApiResponse({ status: 200, description: "Check-out realizado exitosamente" })
	@ApiResponse({ status: 400, description: "Estado de cita inválido para check-out" })
	@ApiResponse({ status: 404, description: "Cita no encontrada" })
	async checkOut(@Param("id") id: string) {
		return this.appointmentService.checkOut(id);
	}

	@Patch(":id/cancel")
	@ApiOperation({ summary: "Cancelar una cita" })
	@ApiResponse({ status: 200, description: "Cita cancelada exitosamente" })
	@ApiResponse({ status: 400, description: "No se puede cancelar la cita" })
	@ApiResponse({ status: 404, description: "Cita no encontrada" })
	async cancel(@Param("id") id: string) {
		return this.appointmentService.cancel(id);
	}

	@Delete(":id")
	@ApiOperation({ summary: "Eliminar una cita" })
	@ApiResponse({ status: 200, description: "Cita eliminada exitosamente" })
	@ApiResponse({ status: 404, description: "Cita no encontrada" })
	async delete(@Param("id") id: string) {
		await this.appointmentService.delete(id);
		return { message: "Cita eliminada exitosamente" };
	}

	@Post("archive-old")
	@ApiOperation({ summary: "Archivar citas completadas con más de 12 horas" })
	@ApiQuery({ name: "supplierId", required: false, description: "Filtrar por proveedor" })
	@ApiResponse({ status: 200, description: "Citas archivadas exitosamente" })
	async archiveOld(@Query("supplierId") supplierId?: string) {
		return this.appointmentService.archiveOldAppointments(supplierId);
	}

	@Patch(":id/archive")
	@ApiOperation({ summary: "Archivar una cita específica" })
	@ApiResponse({ status: 200, description: "Cita archivada exitosamente" })
	@ApiResponse({ status: 404, description: "Cita no encontrada" })
	async archiveAppointment(@Param("id") id: string) {
		return this.appointmentService.archiveAppointment(id);
	}

	@Patch(":id/unarchive")
	@ApiOperation({ summary: "Desarchivar una cita" })
	@ApiResponse({ status: 200, description: "Cita desarchivada exitosamente" })
	@ApiResponse({ status: 404, description: "Cita no encontrada" })
	async unarchiveAppointment(@Param("id") id: string) {
		return this.appointmentService.unarchiveAppointment(id);
	}
}
