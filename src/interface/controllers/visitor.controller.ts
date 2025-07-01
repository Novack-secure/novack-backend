import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	ParseUUIDPipe,
	HttpStatus,
	HttpCode,
	Query,
	UseInterceptors,
	UploadedFile,
	BadRequestException,
	InternalServerErrorException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
// VisitorService is no longer directly used by the controller
// import { VisitorService } from '../../application/services/visitor.service';
import {
	CreateVisitorAndAppointmentUseCase,
	GetAllVisitorsUseCase,
	GetVisitorDetailsUseCase,
	UpdateVisitorAndAppointmentUseCase,
	DeleteVisitorUseCase,
	CheckOutVisitorUseCase,
	GetVisitorsBySupplierUseCase,
	UpdateVisitorProfileImageUseCase,
} from "../../application/use-cases/visitor"; // Import all use cases
import {
	CreateVisitorDto, // This DTO is used by CreateVisitorAndAppointmentUseCase
	UpdateVisitorDto, // This DTO is used by UpdateVisitorAndAppointmentUseCase
} from "../../application/dtos/visitor"; // Assuming DTOs are correctly pathed or re-exported
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiParam,
	ApiBody,
	ApiQuery,
	ApiConsumes,
} from "@nestjs/swagger";
import { FileStorageService } from "../../application/services/file-storage.service";
import { ImageProcessingPipe } from "../../application/pipes/image-processing.pipe";
import { Express } from "express"; // Multer types

@ApiTags("visitors")
@Controller("visitors")
export class VisitorController {
	constructor(
		// private readonly visitorService: VisitorService, // Replaced by use cases
		private readonly createVisitorAndAppointmentUseCase: CreateVisitorAndAppointmentUseCase,
		private readonly getAllVisitorsUseCase: GetAllVisitorsUseCase,
		private readonly getVisitorDetailsUseCase: GetVisitorDetailsUseCase,
		private readonly updateVisitorAndAppointmentUseCase: UpdateVisitorAndAppointmentUseCase,
		private readonly deleteVisitorUseCase: DeleteVisitorUseCase,
		private readonly checkOutVisitorUseCase: CheckOutVisitorUseCase,
		private readonly getVisitorsBySupplierUseCase: GetVisitorsBySupplierUseCase,
		private readonly updateVisitorProfileImageUseCase: UpdateVisitorProfileImageUseCase,
		private readonly fileStorageService: FileStorageService, // Still needed for direct S3 upload logic
		private readonly configService: ConfigService, // Still needed for S3 bucket name
	) {}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: "Crear un nuevo visitante y su cita inicial" }) // Updated summary
	@ApiBody({ type: CreateVisitorDto })
	@ApiResponse({
		status: 201,
		description: "El visitante y su cita han sido creados exitosamente.", // Updated description
		// Consider returning the created Visitor entity, which use cases usually do.
		// Schema should reflect the Visitor entity structure.
	})
	@ApiResponse({
		status: 400,
		description: `Datos de entrada inválidos.`,
	})
	create(@Body() createVisitorDto: CreateVisitorDto) {
		return this.createVisitorAndAppointmentUseCase.execute(createVisitorDto);
	}

	@Get()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Obtener todos los visitantes",
	})
	@ApiResponse({
		status: 200,
		description: "Lista de todos los visitantes.", // Simplified, relations depend on use case/repo
	})
	findAll() {
		return this.getAllVisitorsUseCase.execute();
	}

	@Get("by-supplier")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Obtener visitantes por proveedor", // Updated summary
		description: `Obtiene todos los visitantes asociados a un proveedor específico.`, // Simplified
	})
	@ApiQuery({
		name: "supplier_id",
		description: "ID UUID del proveedor",
		required: true,
		type: String,
	})
	@ApiResponse({
		status: 200,
		description: "Lista de visitas del proveedor.",
	})
	@ApiResponse({
		status: 400,
		description: "ID de proveedor con formato inválido.",
	})
	@ApiResponse({
		status: 404,
		description: "Proveedor no encontrado en el sistema.",
	})
	findBySupplier(
		@Query("supplier_id", new ParseUUIDPipe({ version: "4" }))
		supplier_id: string,
	) {
		return this.getVisitorsBySupplierUseCase.execute(supplier_id);
	}

	@Get(":id")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: "Obtener un visitante por ID" })
	@ApiParam({
		name: "id",
		description: "ID UUID del visitante",
		example: "123e4567-e89b-12d3-a456-426614174000",
	})
	@ApiResponse({
		status: 200,
		description: "El visitante ha sido encontrado.",
		// Schema should reflect Visitor entity
	})
	@ApiResponse({
		status: 400,
		description: "ID con formato inválido.",
	})
	@ApiResponse({
		status: 404,
		description: "Visitante no encontrado en el sistema.",
	})
	findOne(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string) {
		return this.getVisitorDetailsUseCase.execute(id);
	}

	@Patch(":id")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Actualizar un visitante y su cita asociada", // Updated summary
		description: `Actualiza los datos de un visitante existente y su cita principal.`, // Simplified
	})
	@ApiParam({
		name: "id",
		description: "ID UUID del visitante a actualizar",
		example: "123e4567-e89b-12d3-a456-426614174000",
	})
	@ApiBody({ type: UpdateVisitorDto })
	@ApiResponse({
		status: 200,
		description: "El visitante ha sido actualizado exitosamente.",
		// Schema should reflect Visitor entity
	})
	@ApiResponse({
		status: 400,
		description: "Datos de entrada inválidos o ID con formato incorrecto.",
	})
	@ApiResponse({
		status: 404,
		description: "Visitante no encontrado en el sistema.",
	})
	update(
		@Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
		@Body() updateVisitorDto: UpdateVisitorDto,
	) {
		return this.updateVisitorAndAppointmentUseCase.execute(
			id,
			updateVisitorDto,
		);
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({
		summary: "Eliminar un visitante",
		description: `Elimina un visitante del sistema. La eliminación de citas asociadas depende de las reglas de cascada de la base de datos.`, // Clarified cascade behavior
	})
	@ApiParam({
		name: "id",
		description: "ID UUID del visitante a eliminar",
		example: "123e4567-e89b-12d3-a456-426614174000",
	})
	@ApiResponse({
		status: 204,
		description: "El visitante ha sido eliminado exitosamente.",
	})
	@ApiResponse({ status: 400, description: "ID con formato inválido." })
	@ApiResponse({
		status: 404,
		description: "Visitante no encontrado en el sistema.",
	})
	remove(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string) {
		return this.deleteVisitorUseCase.execute(id); // Returns Promise<void>
	}

	@Post(":id/check-out")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Realizar check-out de un visitante",
		description: `Registra la salida de un visitante, actualiza su estado y el de la cita, y libera la tarjeta asignada.`, // Simplified
	})
	@ApiParam({
		name: "id",
		description: "ID UUID del visitante",
		example: "123e4567-e89b-12d3-a456-426614174000",
	})
	@ApiResponse({
		status: 200,
		description: "Check-out realizado exitosamente.",
		// Schema should reflect Visitor entity
	})
	@ApiResponse({
		status: 400,
		description: `Operación inválida. Posibles errores:
        - Visitante ya realizó check-out
        - Visitante no tiene tarjeta asignada o cita activa
        - ID con formato inválido`, // Updated examples
	})
	@ApiResponse({
		status: 404,
		description: "Visitante no encontrado en el sistema.",
	})
	checkOut(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string) {
		return this.checkOutVisitorUseCase.execute(id);
	}

	@Patch(":id/profile-image")
	@HttpCode(HttpStatus.OK)
	@UseInterceptors(FileInterceptor("profileImage")) // Keep FileInterceptor
	@ApiOperation({
		summary: "Subir o actualizar imagen de perfil del visitante",
	})
	@ApiParam({ name: "id", description: "ID UUID del visitante", type: String })
	@ApiConsumes("multipart/form-data")
	@ApiBody({
		description: "Archivo de imagen de perfil (JPG, PNG, WEBP)",
		schema: {
			type: "object",
			properties: {
				profileImage: { type: "string", format: "binary" },
			},
		},
	})
	@ApiResponse({
		status: 200,
		description: "Imagen de perfil actualizada.",
		schema: {
			properties: { message: { type: "string" }, url: { type: "string" } },
		},
	})
	@ApiResponse({
		status: 400,
		description:
			"Archivo inválido, tipo no permitido o error de procesamiento.",
	})
	@ApiResponse({ status: 404, description: "Visitante no encontrado." })
	async uploadProfileImage(
		@Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
		@UploadedFile(ImageProcessingPipe) // Keep custom pipe
		file: Express.Multer.File, // Use Express.Multer.File for type
	) {
		if (!file) {
			throw new BadRequestException("No se proporcionó ningún archivo.");
		}

		const bucketName = this.configService.get<string>(
			"AWS_S3_VISITOR_BUCKET_NAME",
		);
		if (!bucketName) {
			// En lugar de acceder al logger directamente, registramos el error con console.log
			console.error("AWS_S3_VISITOR_BUCKET_NAME not configured");
			throw new InternalServerErrorException(
				"Error de configuración del almacenamiento de archivos.",
			);
		}

		const destinationPath = `profile/`; // Define a clear path within the bucket
		const imageUrl = await this.fileStorageService.uploadFile(
			bucketName,
			file.buffer,
			file.originalname, // Consider sanitizing or generating a unique name
			file.mimetype,
			destinationPath,
		);

		// Call the use case to update the visitor entity with the new URL
		await this.updateVisitorProfileImageUseCase.execute(id, imageUrl);

		return {
			message: "Imagen de perfil actualizada correctamente.",
			url: imageUrl,
		};
	}
}
