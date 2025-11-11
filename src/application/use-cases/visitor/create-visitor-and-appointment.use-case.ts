import {
	Inject,
	Injectable,
	BadRequestException,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Visitor } from "src/domain/entities/visitor.entity";
import { Appointment } from "src/domain/entities/appointment.entity";
import { Supplier } from "src/domain/entities/supplier.entity";
import { Employee } from "src/domain/entities/employee.entity";
import { IVisitorRepository } from "src/domain/repositories/visitor.repository.interface";
import { IAppointmentRepository } from "src/domain/repositories/appointment.repository.interface";
import { ISupplierRepository } from "src/domain/repositories/supplier.repository.interface";
import { EmailService } from "src/application/services/email.service";
import { CardService } from "src/application/services/card.service";
import { CreateVisitorDto } from "src/application/dtos/visitor/create-visitor.dto";
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service";

@Injectable()
export class CreateVisitorAndAppointmentUseCase {
	constructor(
		@Inject(IVisitorRepository)
		private readonly visitorRepository: IVisitorRepository,
		@Inject(IAppointmentRepository)
		private readonly appointmentRepository: IAppointmentRepository,
		@Inject(ISupplierRepository)
		private readonly supplierRepository: ISupplierRepository,
		@InjectRepository(Employee)
		private readonly employeeRepository: Repository<Employee>,
		private readonly emailService: EmailService,
		private readonly cardService: CardService,
		private readonly logger: StructuredLoggerService,
	) {
		this.logger.setContext("CreateVisitorAndAppointmentUseCase");
	}

	private validateDates(check_in_time: Date, check_out_time?: Date): void {
		if (check_out_time) {
			if (new Date(check_out_time) <= new Date(check_in_time)) {
				this.logger.warn(
					"Validation failed: Check-out time must be after check-in time",
					undefined,
					{ check_in_time, check_out_time },
				);
				throw new BadRequestException(
					"La hora de salida debe ser posterior a la hora de entrada",
				);
			}
		}
	}

	async execute(createVisitorDto: CreateVisitorDto): Promise<Visitor> {
		this.logger.log("Attempting to create visitor and appointment", undefined, {
			visitorEmail: createVisitorDto.email,
			supplierId: createVisitorDto.supplier_id,
			checkInTime: createVisitorDto.check_in_time,
		});

		const supplier = await this.supplierRepository.findById(
			createVisitorDto.supplier_id,
		);
		if (!supplier) {
			this.logger.warn("Supplier not found for visitor creation", undefined, {
				supplierId: createVisitorDto.supplier_id,
			});
			throw new BadRequestException("El proveedor especificado no existe");
		}

		this.validateDates(
			createVisitorDto.check_in_time,
			createVisitorDto.check_out_time,
		);

		// Validate host employee if provided
		let hostEmployee = null;
		if (createVisitorDto.host_employee_id) {
			hostEmployee = await this.employeeRepository.findOne({
				where: { id: createVisitorDto.host_employee_id },
			});
			if (!hostEmployee) {
				this.logger.warn("Host employee not found for visitor creation", undefined, {
					hostEmployeeId: createVisitorDto.host_employee_id,
				});
				throw new BadRequestException("El empleado anfitrión especificado no existe");
			}
		}

		// Create Visitor entity instance
		const visitorEntityData: Partial<Visitor> = {
			name: createVisitorDto.name,
			email: createVisitorDto.email,
			phone: createVisitorDto.phone,
			location: createVisitorDto.location,
			state: "pendiente", // Initial state
			supplier: supplier,
			supplier_id: supplier.id, // Añadido para asignar el supplier_id explícitamente
			// profile_image_url can be set if part of DTO and entity
		};
		const visitorInstance = this.visitorRepository.create(visitorEntityData);
		const savedVisitor = await this.visitorRepository.save(visitorInstance);
		this.logger.log("Visitor entity created successfully", undefined, {
			visitorId: savedVisitor.id,
			email: savedVisitor.email,
		});

		// Create Appointment entity instance
		const appointmentEntityData: Partial<Appointment> = {
			title: createVisitorDto.appointment,
			description: createVisitorDto.appointment_description,
			scheduled_time: new Date(), // Current time as scheduled, or from DTO if provided
			check_in_time: new Date(createVisitorDto.check_in_time),
			check_out_time: createVisitorDto.check_out_time
				? new Date(createVisitorDto.check_out_time)
				: undefined,
			complaints: createVisitorDto.complaints || { invitado1: "ninguno" }, // Default or from DTO
			status: "pendiente", // Initial status
			location: createVisitorDto.appointment_location,
			visitor: savedVisitor, // Link to the saved visitor
			supplier: supplier, // Link to the supplier
			host_employee: hostEmployee, // Link to the host employee
		};
		const appointmentInstance = this.appointmentRepository.create(
			appointmentEntityData,
		);
		const savedAppointment =
			await this.appointmentRepository.save(appointmentInstance);
		this.logger.log("Appointment entity created successfully", undefined, {
			appointmentId: savedAppointment.id,
			visitorId: savedVisitor.id,
		});

		// Send welcome email
		try {
			await this.emailService.sendVisitorWelcomeEmail(
				savedVisitor.email,
				savedVisitor.name,
				savedAppointment.check_in_time,
				savedVisitor.location,
				// qrCodeUrl - this was optional in EmailService, decide if it's generated here or passed in DTO
			);
			this.logger.log("Visitor welcome email dispatch requested", undefined, {
				visitorId: savedVisitor.id,
				email: savedVisitor.email,
			});
		} catch (error) {
			this.logger.warn("Failed to send visitor welcome email", undefined, {
				visitorId: savedVisitor.id,
				email: savedVisitor.email,
				error: error.message,
			});
			// Do not re-throw here to allow visitor/appointment creation to succeed
		}

		// Assign card
		try {
			const availableCards = await this.cardService.findAvailableCards();
			if (availableCards.length > 0) {
				await this.cardService.assignToVisitor(
					availableCards[0].id,
					savedVisitor.id,
				);
				this.logger.log("Card assigned to visitor", undefined, {
					visitorId: savedVisitor.id,
					cardId: availableCards[0].id,
				});
			} else {
				this.logger.warn("No available card to assign to visitor", undefined, {
					visitorId: savedVisitor.id,
				});
			}
		} catch (error) {
			this.logger.warn("Failed to assign card to visitor", undefined, {
				visitorId: savedVisitor.id,
				error: error.message,
			});
			// Do not re-throw here
		}

		// Re-fetch the visitor to ensure all relations (like appointments) are loaded for the return value.
		// This depends on how IVisitorRepository.findById is implemented (e.g., which relations it loads by default).
		const finalVisitor = await this.visitorRepository.findById(savedVisitor.id);
		if (!finalVisitor) {
			this.logger.error(
				"Failed to re-fetch visitor after creation, though creation was successful.",
				undefined,
				undefined,
				{ visitorId: savedVisitor.id },
			);
			// This state is problematic: visitor was created but cannot be returned.
			// Depending on transactional setup, this might warrant a different error or handling.
			throw new NotFoundException(
				`Visitor with ID "${savedVisitor.id}" was created but could not be retrieved.`,
			);
		}
		this.logger.log(
			"Successfully created visitor and appointment, and initiated post-creation tasks.",
			undefined,
			{ visitorId: finalVisitor.id },
		);
		return finalVisitor;
	}
}
