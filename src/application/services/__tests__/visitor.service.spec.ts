import { Test, TestingModule } from "@nestjs/testing";
import { VisitorService } from "../visitor.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Visitor, Supplier, Card, Appointment } from "src/domain/entities";
import { BadRequestException } from "@nestjs/common";
import { CreateVisitorDto, UpdateVisitorDto } from "../../dtos/visitor";
import { CardService } from "../card.service";
import { EmailService } from "../email.service";
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service";

describe("VisitorService", () => {
	// Removed MOCK_LOGGER_PLACEHOLDER
	let service: VisitorService;
	let visitorRepository: Repository<Visitor>;
	let supplierRepository: Repository<Supplier>;
	let appointmentRepository: Repository<Appointment>;
	let cardService: CardService;
	let emailService: EmailService;
	let logger: StructuredLoggerService; // Changed from mockLogger to logger for the instance variable

	// Define the mock logger object here so it's in scope for Test.createTestingModule
	const mockLoggerInstance = {
		setContext: jest.fn(),
		log: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		verbose: jest.fn(),
	};

	// Mock data
	const mockSupplier = {
		id: "1",
		supplier_name: "Test Supplier",
		contact_email: "supplier@example.com",
	};

	const mockCard = {
		id: "1",
		card_number: "CARD123",
		status: "active",
		type: "visitor",
	};

	const mockAppointment = {
		id: "1",
		title: "Business Meeting",
		description: "Important business discussion",
		scheduled_time: new Date(),
		check_in_time: new Date(),
		check_out_time: null,
		complaints: { invitado1: "ninguno" },
		status: "pendiente",
	};

	const mockVisitor = {
		id: "1",
		name: "John Visitor",
		email: "john@visitor.com",
		phone: "123456789",
		location: "Meeting Room A",
		state: "pendiente",
		supplier: mockSupplier,
		appointments: [mockAppointment],
		card: mockCard,
		profile_image_url: "https://example.com/photo.jpg",
		created_at: new Date(),
		updated_at: new Date(),
	};

	const mockCreateVisitorDto: CreateVisitorDto = {
		name: "New Visitor",
		email: "new@visitor.com",
		phone: "987654321",
		location: "Room 101",
		appointment: "Business Meeting",
		appointment_description: "Discussing new project details",
		check_in_time: new Date(),
		supplier_id: "1",
		complaints: { invitado1: "ninguno" },
	};

	const mockUpdateVisitorDto: UpdateVisitorDto = {
		name: "Updated Visitor",
		email: "updated@visitor.com",
		phone: "111222333",
	};

	beforeEach(async () => {
		const mockCardService = {
			findAvailableCards: jest.fn().mockResolvedValue([mockCard]),
			assignToVisitor: jest
				.fn()
				.mockResolvedValue({ ...mockCard, visitor: mockVisitor }),
			unassignFromVisitor: jest.fn().mockResolvedValue(mockCard),
		};

		const mockEmailService = {
			sendVisitorWelcomeEmail: jest.fn().mockResolvedValue(true),
			sendVisitorCheckoutEmail: jest.fn().mockResolvedValue(true),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				VisitorService,
				{
					provide: getRepositoryToken(Visitor),
					useValue: {
						create: jest.fn(),
						save: jest.fn(),
						find: jest.fn(),
						findOne: jest.fn(),
						findOneBy: jest.fn(),
						update: jest.fn(),
						remove: jest.fn(),
						createQueryBuilder: jest.fn(() => ({
							leftJoinAndSelect: jest.fn().mockReturnThis(),
							where: jest.fn().mockReturnThis(),
							getOne: jest.fn(),
							getMany: jest.fn(),
						})),
					},
				},
				{
					provide: getRepositoryToken(Supplier),
					useValue: {
						findOne: jest.fn(),
						findOneBy: jest.fn(),
					},
				},
				{
					provide: getRepositoryToken(Appointment),
					useValue: {
						create: jest.fn(),
						save: jest.fn(),
						find: jest.fn(),
						findOne: jest.fn(),
						update: jest.fn(),
					},
				},
				{
					provide: CardService,
					useValue: mockCardService,
				},
				{
					provide: EmailService,
					useValue: mockEmailService,
				},
				{
					provide: StructuredLoggerService,
					useValue: mockLoggerInstance, // Use the defined mock instance
				},
			],
		}).compile();

		service = module.get<VisitorService>(VisitorService);
		logger = module.get<StructuredLoggerService>(StructuredLoggerService);
		visitorRepository = module.get<Repository<Visitor>>(
			getRepositoryToken(Visitor),
		);
		supplierRepository = module.get<Repository<Supplier>>(
			getRepositoryToken(Supplier),
		);
		appointmentRepository = module.get<Repository<Appointment>>(
			getRepositoryToken(Appointment),
		);
		cardService = module.get<CardService>(CardService);
		emailService = module.get<EmailService>(EmailService);
	});

	// mockLogger object is now defined above as mockLoggerInstance

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("create", () => {
		it("should create a new visitor successfully", async () => {
			jest
				.spyOn(supplierRepository, "findOne")
				.mockResolvedValue(mockSupplier as any);
			jest
				.spyOn(visitorRepository, "create")
				.mockReturnValue(mockVisitor as any);
			jest
				.spyOn(visitorRepository, "save")
				.mockResolvedValue(mockVisitor as any);
			jest
				.spyOn(appointmentRepository, "create")
				.mockReturnValue(mockAppointment as any);
			jest
				.spyOn(appointmentRepository, "save")
				.mockResolvedValue(mockAppointment as any);
			jest
				.spyOn(cardService, "findAvailableCards")
				.mockResolvedValue([mockCard] as any);
			jest
				.spyOn(cardService, "assignToVisitor")
				.mockResolvedValue({ ...mockCard, visitor: mockVisitor } as any);
			jest
				.spyOn(emailService, "sendVisitorWelcomeEmail")
				.mockResolvedValue(true as any);

			jest
				.spyOn(visitorRepository, "findOne")
				.mockResolvedValueOnce(mockVisitor as any);

			const result = await service.create(mockCreateVisitorDto);

			expect(result).toEqual(mockVisitor);
			expect(supplierRepository.findOne).toHaveBeenCalledWith({
				where: { id: mockCreateVisitorDto.supplier_id },
			});
			expect(visitorRepository.save).toHaveBeenCalled();
			expect(appointmentRepository.save).toHaveBeenCalled();
		});

		it("should throw error if supplier does not exist", async () => {
			jest.spyOn(supplierRepository, "findOne").mockResolvedValue(null);

			await expect(service.create(mockCreateVisitorDto)).rejects.toThrow(
				BadRequestException,
			);
		});
	});

	describe("findAll", () => {
		it("should return an array of visitors", async () => {
			const mockVisitors = [mockVisitor];
			jest
				.spyOn(visitorRepository, "find")
				.mockResolvedValue(mockVisitors as any);

			const result = await service.findAll();

			expect(result).toEqual(mockVisitors);
			expect(visitorRepository.find).toHaveBeenCalledWith({
				relations: ["supplier", "card", "appointments"],
			});
		});
	});

	describe("findOne", () => {
		it("should return a single visitor by id", async () => {
			jest
				.spyOn(visitorRepository, "findOne")
				.mockResolvedValue(mockVisitor as any);

			const result = await service.findOne("1");

			expect(result).toEqual(mockVisitor);
			expect(visitorRepository.findOne).toHaveBeenCalledWith({
				where: { id: "1" },
				relations: ["supplier", "card", "appointments"],
			});
		});

		it("should throw exception if visitor not found", async () => {
			jest.spyOn(visitorRepository, "findOne").mockResolvedValue(null);

			await expect(service.findOne("1")).rejects.toThrow(BadRequestException);
		});
	});

	describe("update", () => {
		it("should update a visitor successfully", async () => {
			const updatedVisitor = {
				...mockVisitor,
				name: mockUpdateVisitorDto.name,
				email: mockUpdateVisitorDto.email,
				phone: mockUpdateVisitorDto.phone,
			};

			jest
				.spyOn(visitorRepository, "findOne")
				.mockResolvedValue(mockVisitor as any);
			jest
				.spyOn(visitorRepository, "save")
				.mockResolvedValue(updatedVisitor as any);
			jest
				.spyOn(appointmentRepository, "save")
				.mockResolvedValue(mockAppointment as any);

			const result = await service.update("1", mockUpdateVisitorDto);

			expect(result).toEqual(updatedVisitor);
			expect(visitorRepository.findOne).toHaveBeenCalledWith({
				where: { id: "1" },
				relations: ["supplier", "card", "appointments"],
			});
			expect(visitorRepository.save).toHaveBeenCalled();
		});

		it("should throw error if visitor not found", async () => {
			jest.spyOn(visitorRepository, "findOne").mockResolvedValue(null);

			await expect(service.update("1", mockUpdateVisitorDto)).rejects.toThrow(
				BadRequestException,
			);
		});
	});

	describe("checkOut", () => {
		it("should checkout a visitor successfully", async () => {
			const checkedOutVisitor = {
				...mockVisitor,
				state: "completado",
				appointments: [
					{
						...mockAppointment,
						check_out_time: new Date(),
						status: "completado",
					},
				],
			};

			jest
				.spyOn(visitorRepository, "findOne")
				.mockResolvedValue(mockVisitor as any);
			jest
				.spyOn(visitorRepository, "save")
				.mockResolvedValue(checkedOutVisitor as any);
			jest.spyOn(appointmentRepository, "save").mockResolvedValue({
				...mockAppointment,
				check_out_time: expect.any(Date),
				status: "completado",
			} as any);
			jest
				.spyOn(cardService, "unassignFromVisitor")
				.mockResolvedValue(mockCard as any);
			jest
				.spyOn(emailService, "sendVisitorCheckoutEmail")
				.mockResolvedValue(true as any);

			const result = await service.checkOut("1");

			expect(result).toEqual(checkedOutVisitor);
			expect(visitorRepository.findOne).toHaveBeenCalled();
			expect(visitorRepository.save).toHaveBeenCalled();
			expect(appointmentRepository.save).toHaveBeenCalled();
			expect(cardService.unassignFromVisitor).toHaveBeenCalled();
		});

		it("should throw error if visitor not found", async () => {
			jest.spyOn(visitorRepository, "findOne").mockResolvedValue(null);

			await expect(service.checkOut("1")).rejects.toThrow(BadRequestException);
		});

		it("should throw error if visitor already checked out", async () => {
			const checkedOutVisitor = {
				...mockVisitor,
				state: "completado",
			};

			jest
				.spyOn(visitorRepository, "findOne")
				.mockResolvedValue(checkedOutVisitor as any);

			await expect(service.checkOut("1")).rejects.toThrow(BadRequestException);
		});
	});
});
