import { Test, TestingModule } from "@nestjs/testing";
import { CheckOutVisitorUseCase } from "./check-out-visitor.use-case";
import { IVisitorRepository } from "src/domain/repositories/visitor.repository.interface"; // Fixed
import { IAppointmentRepository } from "src/domain/repositories/appointment.repository.interface"; // Fixed
import { CardService } from "src/application/services/card.service"; // Fixed
import { EmailService } from "src/application/services/email.service";
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service";
import { Visitor } from "src/domain/entities/visitor.entity";
import { Appointment } from "src/domain/entities/appointment.entity"; // Path was correct
import { Card } from "src/domain/entities/card.entity";
import { BadRequestException, NotFoundException } from "@nestjs/common";
// No change needed here, paths are correct. Adding a comment for the tool.

// --- Mocks ---
const mockVisitorRepository = {
	findById: jest.fn(),
	save: jest.fn(),
};
const mockAppointmentRepository = {
	findById: jest.fn(), // For fetching the specific appointment
	save: jest.fn(),
};
const mockCardService = {
	unassignFromVisitor: jest.fn(),
};
const mockEmailService = {
	sendVisitorCheckoutEmail: jest.fn(),
};
const mockLoggerService = {
	setContext: jest.fn(),
	log: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

describe("CheckOutVisitorUseCase", () => {
	let useCase: CheckOutVisitorUseCase;
	let visitorRepo: IVisitorRepository;
	let appointmentRepo: IAppointmentRepository;
	let cardService: CardService;
	let emailService: EmailService;

	const visitorId = "visitor-checkout-uuid";
	const appointmentId = "appt-checkout-uuid";
	const cardId = "card-checkout-uuid";

	const mockCheckedInAppointmentBase = {
		// Renamed to avoid conflict
		id: appointmentId,
		title: "Checked In Appointment",
		check_in_time: new Date(Date.now() - 3600000), // Checked in 1 hour ago
		check_out_time: null,
		status: "en_progreso",
		// other fields...
	} as Appointment;

	const mockVisitorWithCardBase = {
		// Renamed to avoid conflict
		id: visitorId,
		name: "Visitor With Card",
		email: "visitor.card@example.com",
		state: "en_progreso",
		appointments: [mockCheckedInAppointmentBase], // Use base mock
		card: { id: cardId } as Card,
		location: "Test Location",
	} as Visitor;

	const mockVisitorWithoutCardBase = {
		// Renamed to avoid conflict
		id: visitorId,
		name: "Visitor No Card",
		email: "visitor.nocard@example.com",
		state: "en_progreso",
		appointments: [mockCheckedInAppointmentBase], // Use base mock
		card: null,
		location: "Test Location",
	} as Visitor;

	beforeEach(async () => {
		jest.resetAllMocks();

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				CheckOutVisitorUseCase,
				{ provide: IVisitorRepository, useValue: mockVisitorRepository },
				{
					provide: IAppointmentRepository,
					useValue: mockAppointmentRepository,
				},
				{ provide: CardService, useValue: mockCardService },
				{ provide: EmailService, useValue: mockEmailService },
				{ provide: StructuredLoggerService, useValue: mockLoggerService },
			],
		}).compile();

		useCase = module.get<CheckOutVisitorUseCase>(CheckOutVisitorUseCase);
		visitorRepo = module.get<IVisitorRepository>(IVisitorRepository);
		appointmentRepo = module.get<IAppointmentRepository>(
			IAppointmentRepository,
		);
		cardService = module.get<CardService>(CardService);
		emailService = module.get<EmailService>(EmailService);
	});

	it("should be defined", () => {
		expect(useCase).toBeDefined();
	});

	describe("execute", () => {
		let mockVisitorWithCard: Visitor;
		let mockVisitorWithoutCard: Visitor;
		let mockCheckedInAppointment: Appointment;

		beforeEach(() => {
			// Create fresh copies for each test to avoid state leakage across tests if objects are mutated
			mockCheckedInAppointment = JSON.parse(
				JSON.stringify(mockCheckedInAppointmentBase),
			) as Appointment;
			mockCheckedInAppointment.check_in_time = new Date(
				mockCheckedInAppointment.check_in_time,
			); // Restore Date object

			mockVisitorWithCard = JSON.parse(
				JSON.stringify(mockVisitorWithCardBase),
			) as Visitor;
			mockVisitorWithCard.appointments = [mockCheckedInAppointment];
			if (mockVisitorWithCard.card) mockVisitorWithCard.card.id = cardId; // Ensure card ID

			mockVisitorWithoutCard = JSON.parse(
				JSON.stringify(mockVisitorWithoutCardBase),
			) as Visitor;
			mockVisitorWithoutCard.appointments = [mockCheckedInAppointment];

			// Default successful mock implementations
			mockVisitorRepository.findById.mockResolvedValue(mockVisitorWithCard);
			mockAppointmentRepository.findById.mockResolvedValue(
				mockCheckedInAppointment,
			);
			mockVisitorRepository.save.mockImplementation((v) =>
				Promise.resolve(v as Visitor),
			);
			mockAppointmentRepository.save.mockImplementation((a) =>
				Promise.resolve(a as Appointment),
			);
			mockCardService.unassignFromVisitor.mockResolvedValue(undefined as any); // TypeORM remove often returns void
			mockEmailService.sendVisitorCheckoutEmail.mockResolvedValue({
				id: "email-id",
			} as any); // Resend type
		});

		it("should successfully check out a visitor with a card, unassign card, and send email", async () => {
			const result = await useCase.execute(visitorId);

			expect(visitorRepo.findById).toHaveBeenCalledWith(visitorId);
			expect(appointmentRepo.findById).toHaveBeenCalledWith(appointmentId);
			expect(appointmentRepo.save).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "completado",
					check_out_time: expect.any(Date),
				}),
			);
			expect(visitorRepo.save).toHaveBeenCalledWith(
				expect.objectContaining({ state: "completado" }),
			);
			expect(cardService.unassignFromVisitor).toHaveBeenCalledWith(cardId);
			expect(emailService.sendVisitorCheckoutEmail).toHaveBeenCalled();
			expect(result.state).toEqual("completado");
			expect(mockLoggerService.log).toHaveBeenCalledWith(
				expect.stringContaining("Visitor check-out initiated"),
				undefined,
				undefined,
				{ visitorId },
			);
			expect(mockLoggerService.log).toHaveBeenCalledWith(
				expect.stringContaining('Appointment updated to "completado"'),
				undefined,
				undefined,
				expect.objectContaining({ appointmentId }),
			);
			expect(mockLoggerService.log).toHaveBeenCalledWith(
				expect.stringContaining('Visitor state updated to "completado"'),
				undefined,
				undefined,
				expect.objectContaining({ visitorId }),
			);
			expect(mockLoggerService.log).toHaveBeenCalledWith(
				expect.stringContaining("Card unassigned"),
				undefined,
				undefined,
				expect.objectContaining({ cardId }),
			);
			expect(mockLoggerService.log).toHaveBeenCalledWith(
				expect.stringContaining("Visitor checkout email dispatch requested"),
				undefined,
				undefined,
				expect.objectContaining({ visitorId }),
			);
		});

		it("should successfully check out a visitor without a card", async () => {
			mockVisitorRepository.findById.mockResolvedValue(mockVisitorWithoutCard);

			await useCase.execute(visitorId);

			expect(cardService.unassignFromVisitor).not.toHaveBeenCalled();
			expect(mockLoggerService.log).not.toHaveBeenCalledWith(
				expect.stringContaining("Card unassigned"),
				undefined,
				undefined,
				expect.anything(),
			);
			expect(visitorRepo.save).toHaveBeenCalledWith(
				expect.objectContaining({ state: "completado" }),
			);
			expect(emailService.sendVisitorCheckoutEmail).toHaveBeenCalled();
		});

		it("should throw NotFoundException if visitor not found", async () => {
			mockVisitorRepository.findById.mockResolvedValue(null);
			await expect(useCase.execute(visitorId)).rejects.toThrow(
				NotFoundException,
			);
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				expect.stringContaining("Visitor not found for check-out"),
				undefined,
				undefined,
				{ visitorId },
			);
		});

		it("should throw BadRequestException if visitor already checked out", async () => {
			mockVisitorRepository.findById.mockResolvedValue({
				...mockVisitorWithCard,
				state: "completado",
			} as Visitor);
			await expect(useCase.execute(visitorId)).rejects.toThrow(
				BadRequestException,
			);
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				expect.stringContaining("Visitor already checked out"),
				undefined,
				undefined,
				expect.objectContaining({ visitorId }),
			);
		});

		it("should throw BadRequestException if visitor has no appointments", async () => {
			mockVisitorRepository.findById.mockResolvedValue({
				...mockVisitorWithCard,
				appointments: [],
			} as Visitor);
			await expect(useCase.execute(visitorId)).rejects.toThrow(
				BadRequestException,
			);
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				expect.stringContaining(
					"No appointments found for visitor during check-out",
				),
				undefined,
				undefined,
				{ visitorId },
			);
		});

		it("should throw NotFoundException if specific appointment not found", async () => {
			mockVisitorRepository.findById.mockResolvedValue(mockVisitorWithCard); // Visitor has an appointment ID listed
			mockAppointmentRepository.findById.mockResolvedValue(null); // But it's not found
			await expect(useCase.execute(visitorId)).rejects.toThrow(
				NotFoundException,
			);
			expect(mockLoggerService.error).toHaveBeenCalledWith(
				expect.stringContaining(
					"Associated appointment not found during checkout",
				),
				undefined,
				undefined,
				expect.objectContaining({ visitorId, appointmentId }),
			);
		});

		it("should throw BadRequestException if appointment not checked in", async () => {
			mockAppointmentRepository.findById.mockResolvedValue({
				...mockCheckedInAppointment,
				check_in_time: null,
			} as any);
			await expect(useCase.execute(visitorId)).rejects.toThrow(
				BadRequestException,
			);
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				expect.stringContaining(
					"Visitor has not checked in for this appointment",
				),
				undefined,
				undefined,
				expect.objectContaining({ visitorId, appointmentId }),
			);
		});

		it("should log warning if unassigning card fails but still complete checkout", async () => {
			mockCardService.unassignFromVisitor.mockRejectedValue(
				new Error("Unassign failed"),
			);
			await useCase.execute(visitorId); // Should not throw
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				expect.stringContaining("Failed to unassign card during check-out"),
				undefined,
				undefined,
				expect.objectContaining({
					visitorId,
					cardId,
					error: "Unassign failed",
				}),
			);
			expect(visitorRepo.save).toHaveBeenCalledWith(
				expect.objectContaining({ state: "completado" }),
			);
			expect(emailService.sendVisitorCheckoutEmail).toHaveBeenCalled();
		});

		it("should log warning if sending checkout email fails but still complete checkout", async () => {
			mockEmailService.sendVisitorCheckoutEmail.mockRejectedValue(
				new Error("Email send failed"),
			);
			await useCase.execute(visitorId); // Should not throw
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				expect.stringContaining("Failed to send visitor checkout email for"),
				undefined,
				undefined,
				expect.objectContaining({ visitorId, error: "Email send failed" }),
			);
			expect(visitorRepo.save).toHaveBeenCalledWith(
				expect.objectContaining({ state: "completado" }),
			);
		});
	});
});
