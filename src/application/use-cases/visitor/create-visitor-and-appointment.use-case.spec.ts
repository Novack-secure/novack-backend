import { Test, TestingModule } from "@nestjs/testing";
import { CreateVisitorAndAppointmentUseCase } from "./create-visitor-and-appointment.use-case";
import { IVisitorRepository } from "src/domain/repositories/visitor.repository.interface"; // Fixed
import { IAppointmentRepository } from "src/domain/repositories/appointment.repository.interface"; // Fixed
import { ISupplierRepository } from "src/domain/repositories/supplier.repository.interface";
import { EmailService } from "src/application/services/email.service";
import { CardService } from "src/application/services/card.service";
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service";
import { CreateVisitorDto } from "src/application/dtos/visitor/create-visitor.dto";
import { Visitor } from "src/domain/entities/visitor.entity";
import { Appointment } from "src/domain/entities/appointment.entity"; // Path was correct
import { Supplier } from "src/domain/entities/supplier.entity";
import { BadRequestException, NotFoundException } from "@nestjs/common";
// No change needed here, paths are correct. Adding a comment for the tool.

// --- Mocks ---
const mockVisitorRepository = {
	create: jest.fn(),
	save: jest.fn(),
	findById: jest.fn(), // For the final re-fetch
};
const mockAppointmentRepository = {
	create: jest.fn(),
	save: jest.fn(),
};
const mockSupplierRepository = {
	findById: jest.fn(),
};
const mockEmailService = {
	sendVisitorWelcomeEmail: jest.fn(),
};
const mockCardService = {
	findAvailableCards: jest.fn(),
	assignToVisitor: jest.fn(),
};
const mockLoggerService = {
	setContext: jest.fn(),
	log: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

describe("CreateVisitorAndAppointmentUseCase", () => {
	let useCase: CreateVisitorAndAppointmentUseCase;

	// To hold references to injected mocks for easier access in tests
	let visitorRepo: IVisitorRepository;
	let appointmentRepo: IAppointmentRepository;
	let supplierRepo: ISupplierRepository;
	let emailService: EmailService;
	let cardService: CardService;

	const baseTime = new Date(Date.now() + 3600000); // In 1 hour
	const createVisitorDto: CreateVisitorDto = {
		name: "Test Visitor",
		email: "test@example.com",
		phone: "1234567890",
		location: "Test Location",
		supplier_id: "supplier-uuid",
		appointment: "Test Appointment",
		appointment_description: "Description",
		check_in_time: baseTime,
		check_out_time: new Date(baseTime.getTime() + 3600000), // 1 hour after check_in_time
		complaints: { guest1: "none" },
		// state is not part of DTO, set by use case
		// profile_image_url is not part of this DTO
	};

	const mockSupplier = {
		id: "supplier-uuid",
		supplier_name: "Test Supplier",
	} as Supplier;

	// Mock what repository.create would return (usually an un-saved entity instance)
	const mockVisitorInstance = {
		...createVisitorDto,
		supplier: mockSupplier,
		state: "pendiente",
		// id and created_at/updated_at would be undefined before save
	} as Partial<Visitor> as Visitor; // Cast to satisfy type, though it's partial before save

	const mockSavedVisitor = {
		...mockVisitorInstance,
		id: "visitor-uuid",
		created_at: new Date(),
		updated_at: new Date(),
	} as Visitor;

	const mockAppointmentInstance = {
		title: createVisitorDto.appointment,
		description: createVisitorDto.appointment_description,
		check_in_time: createVisitorDto.check_in_time,
		check_out_time: createVisitorDto.check_out_time,
		complaints: createVisitorDto.complaints,
		status: "pendiente",
		visitor: mockSavedVisitor,
		supplier: mockSupplier,
		// id and other fields would be undefined before save
	} as Partial<Appointment> as Appointment;

	const mockSavedAppointment = {
		...mockAppointmentInstance,
		id: "appt-uuid",
		scheduled_time: expect.any(Date), // or a fixed date if preferred
	} as Appointment;

	beforeEach(async () => {
		// Reset all mocks using jest.resetAllMocks() or individually
		Object.values(mockVisitorRepository).forEach((fn) => fn.mockReset());
		Object.values(mockAppointmentRepository).forEach((fn) => fn.mockReset());
		Object.values(mockSupplierRepository).forEach((fn) => fn.mockReset());
		Object.values(mockEmailService).forEach((fn) => fn.mockReset());
		Object.values(mockCardService).forEach((fn) => fn.mockReset());
		Object.values(mockLoggerService).forEach((fn) => fn.mockReset());

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				CreateVisitorAndAppointmentUseCase,
				{ provide: IVisitorRepository, useValue: mockVisitorRepository },
				{
					provide: IAppointmentRepository,
					useValue: mockAppointmentRepository,
				},
				{ provide: ISupplierRepository, useValue: mockSupplierRepository },
				{ provide: EmailService, useValue: mockEmailService },
				{ provide: CardService, useValue: mockCardService },
				{ provide: StructuredLoggerService, useValue: mockLoggerService },
			],
		}).compile();

		useCase = module.get<CreateVisitorAndAppointmentUseCase>(
			CreateVisitorAndAppointmentUseCase,
		);
		// Store mock instances
		visitorRepo = module.get<IVisitorRepository>(IVisitorRepository);
		appointmentRepo = module.get<IAppointmentRepository>(
			IAppointmentRepository,
		);
		supplierRepo = module.get<ISupplierRepository>(ISupplierRepository);
		emailService = module.get<EmailService>(EmailService);
		cardService = module.get<CardService>(CardService);
	});

	it("should be defined", () => {
		expect(useCase).toBeDefined();
	});

	describe("execute", () => {
		beforeEach(() => {
			// Default successful mock implementations
			mockSupplierRepository.findById.mockResolvedValue(mockSupplier);
			mockVisitorRepository.create.mockReturnValue(mockVisitorInstance);
			mockVisitorRepository.save.mockResolvedValue(mockSavedVisitor);
			mockAppointmentRepository.create.mockReturnValue(mockAppointmentInstance);
			mockAppointmentRepository.save.mockResolvedValue(mockSavedAppointment);
			mockEmailService.sendVisitorWelcomeEmail.mockResolvedValue({
				id: "email-send-id",
			} as any); // Resend returns object with id
			mockCardService.findAvailableCards.mockResolvedValue([
				{ id: "card-uuid" } as any,
			]);
			mockCardService.assignToVisitor.mockResolvedValue(undefined as any); // Assuming it returns a Card or void
			mockVisitorRepository.findById.mockResolvedValue(mockSavedVisitor); // For the final re-fetch
		});

		it("should successfully create a visitor and appointment, send email, and assign card", async () => {
			const result = await useCase.execute(createVisitorDto);

			expect(result).toEqual(mockSavedVisitor);
			expect(supplierRepo.findById).toHaveBeenCalledWith(
				createVisitorDto.supplier_id,
			);

			expect(visitorRepo.create).toHaveBeenCalledWith({
				name: createVisitorDto.name,
				email: createVisitorDto.email,
				phone: createVisitorDto.phone,
				location: createVisitorDto.location,
				state: "pendiente",
				supplier: mockSupplier,
				supplier_id: mockSupplier.id,
			});
			expect(visitorRepo.save).toHaveBeenCalledWith(mockVisitorInstance);

			expect(appointmentRepo.create).toHaveBeenCalledWith({
				title: createVisitorDto.appointment,
				description: createVisitorDto.appointment_description,
				scheduled_time: expect.any(Date),
				check_in_time: new Date(createVisitorDto.check_in_time),
				check_out_time: createVisitorDto.check_out_time
					? new Date(createVisitorDto.check_out_time)
					: undefined,
				complaints: createVisitorDto.complaints,
				status: "pendiente",
				visitor: mockSavedVisitor,
				supplier: mockSupplier,
			});
			expect(appointmentRepo.save).toHaveBeenCalledWith(
				mockAppointmentInstance,
			);

			expect(emailService.sendVisitorWelcomeEmail).toHaveBeenCalledWith(
				mockSavedVisitor.email,
				mockSavedVisitor.name,
				mockSavedAppointment.check_in_time,
				mockSavedVisitor.location,
			);
			expect(cardService.findAvailableCards).toHaveBeenCalled();
			expect(cardService.assignToVisitor).toHaveBeenCalledWith(
				"card-uuid",
				mockSavedVisitor.id,
			);
			expect(visitorRepo.findById).toHaveBeenCalledWith(mockSavedVisitor.id); // Final fetch

			expect(mockLoggerService.log).toHaveBeenCalledWith(
				"Attempting to create visitor and appointment",
				undefined,
				expect.objectContaining({ visitorEmail: createVisitorDto.email }),
			);
			expect(mockLoggerService.log).toHaveBeenCalledWith(
				"Visitor entity created successfully",
				undefined,
				expect.objectContaining({ visitorId: mockSavedVisitor.id }),
			);
			expect(mockLoggerService.log).toHaveBeenCalledWith(
				"Appointment entity created successfully",
				undefined,
				expect.objectContaining({ appointmentId: mockSavedAppointment.id }),
			);
			expect(mockLoggerService.log).toHaveBeenCalledWith(
				"Visitor welcome email dispatch requested",
				undefined,
				expect.objectContaining({ visitorId: mockSavedVisitor.id }),
			);
			expect(mockLoggerService.log).toHaveBeenCalledWith(
				"Card assigned to visitor",
				undefined,
				expect.objectContaining({
					visitorId: mockSavedVisitor.id,
					cardId: "card-uuid",
				}),
			);
		});

		it("should throw BadRequestException if supplier not found", async () => {
			mockSupplierRepository.findById.mockResolvedValue(null);
			await expect(useCase.execute(createVisitorDto)).rejects.toThrow(
				BadRequestException,
			);
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				"Supplier not found for visitor creation",
				undefined,
				{ supplierId: createVisitorDto.supplier_id },
			);
		});

		it("should throw BadRequestException if dates are invalid (check_out_time <= check_in_time)", async () => {
			const invalidDto = {
				...createVisitorDto,
				check_out_time: createVisitorDto.check_in_time,
			};
			// Mock supplier find to avoid error there
			mockSupplierRepository.findById.mockResolvedValue(mockSupplier);
			await expect(useCase.execute(invalidDto)).rejects.toThrow(
				BadRequestException,
			);
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				"Validation failed: Check-out time must be after check-in time",
				undefined,
				expect.objectContaining({
					check_in_time: invalidDto.check_in_time,
					check_out_time: invalidDto.check_out_time,
				}),
			);
		});

		it("should log warning if sending welcome email fails but still succeed in creating visitor/appointment", async () => {
			mockEmailService.sendVisitorWelcomeEmail.mockRejectedValue(
				new Error("Email system down"),
			);

			await useCase.execute(createVisitorDto); // Should not throw an error that stops execution here

			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				"Failed to send visitor welcome email",
				undefined,
				expect.objectContaining({
					visitorId: mockSavedVisitor.id,
					error: "Email system down",
				}),
			);
			expect(visitorRepo.findById).toHaveBeenCalledWith(mockSavedVisitor.id); // Ensure it still tries to return the visitor
		});

		it("should log warning if finding available cards fails (e.g., CardService throws) but still succeed", async () => {
			mockCardService.findAvailableCards.mockRejectedValue(
				new Error("Card service connection error"),
			);

			await useCase.execute(createVisitorDto);

			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				"Failed to assign card to visitor",
				undefined,
				expect.objectContaining({
					visitorId: mockSavedVisitor.id,
					error: "Card service connection error",
				}),
			);
			expect(cardService.assignToVisitor).not.toHaveBeenCalled();
			expect(visitorRepo.findById).toHaveBeenCalledWith(mockSavedVisitor.id);
		});

		it("should log warning if no cards are available but still succeed", async () => {
			mockCardService.findAvailableCards.mockResolvedValue([]); // No cards available

			await useCase.execute(createVisitorDto);

			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				"No available card to assign to visitor",
				undefined,
				{ visitorId: mockSavedVisitor.id },
			);
			expect(cardService.assignToVisitor).not.toHaveBeenCalled();
			expect(visitorRepo.findById).toHaveBeenCalledWith(mockSavedVisitor.id);
		});

		it("should log warning if assigning card fails (e.g., assignToVisitor throws) but still succeed", async () => {
			mockCardService.findAvailableCards.mockResolvedValue([
				{ id: "card-uuid" } as any,
			]); // Card is available
			mockCardService.assignToVisitor.mockRejectedValue(
				new Error("Card already assigned or inactive"),
			);

			await useCase.execute(createVisitorDto);

			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				"Failed to assign card to visitor",
				undefined,
				expect.objectContaining({
					visitorId: mockSavedVisitor.id,
					error: "Card already assigned or inactive",
				}),
			);
			expect(visitorRepo.findById).toHaveBeenCalledWith(mockSavedVisitor.id);
		});

		it("should throw NotFoundException if final re-fetch of visitor fails", async () => {
			// All previous steps succeed
			mockSupplierRepository.findById.mockResolvedValue(mockSupplier);
			mockVisitorRepository.create.mockReturnValue(mockVisitorInstance);
			mockVisitorRepository.save.mockResolvedValue(mockSavedVisitor);
			mockAppointmentRepository.create.mockReturnValue(mockAppointmentInstance);
			mockAppointmentRepository.save.mockResolvedValue(mockSavedAppointment);
			mockEmailService.sendVisitorWelcomeEmail.mockResolvedValue({
				id: "email-send-id",
			} as any);
			mockCardService.findAvailableCards.mockResolvedValue([
				{ id: "card-uuid" } as any,
			]);
			mockCardService.assignToVisitor.mockResolvedValue(undefined as any);

			mockVisitorRepository.findById.mockResolvedValue(null);

			await expect(useCase.execute(createVisitorDto)).rejects.toThrow(
				NotFoundException,
			);
			expect(mockLoggerService.error).toHaveBeenCalledWith(
				"Failed to re-fetch visitor after creation, though creation was successful.",
				undefined,
				undefined,
				{ visitorId: mockSavedVisitor.id },
			);
		});
	});
});
