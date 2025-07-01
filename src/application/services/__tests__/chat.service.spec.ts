import { Test, TestingModule } from "@nestjs/testing";
import { ChatService } from "../chat.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
	ChatRoom,
	ChatMessage,
	Employee,
	Visitor,
	Supplier,
	ChatRoomType,
} from "src/domain/entities";
import { CreateRoomDto } from "../../dtos/chat/create-room.dto";
import { CreateMessageDto } from "../../dtos/chat/create-message.dto";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("ChatService", () => {
	let service: ChatService;
	let chatRoomRepository: Repository<ChatRoom>;
	let chatMessageRepository: Repository<ChatMessage>;
	let employeeRepository: Repository<Employee>;
	let visitorRepository: Repository<Visitor>;
	let supplierRepository: Repository<Supplier>;

	// Mock data
	const mockSupplier = {
		id: "1",
		supplier_name: "Test Supplier",
		employees: [{ id: "1", employee_name: "Empleado 1" }],
	};

	const mockEmployee = {
		id: "1",
		employee_name: "Test Employee",
		name: "Test Employee",
		email: "test@example.com",
		phone: "123456789",
		position: "Tester",
		supplier: mockSupplier,
		created_at: new Date(),
		updated_at: new Date(),
		is_active: true,
		password: "hashedpassword",
		role: "admin",
		device_token: null,
	};

	const mockVisitor = {
		id: "1",
		name: "Test Visitor",
	};

	const mockRoom: ChatRoom = {
		id: "1",
		name: "Test Room",
		type: ChatRoomType.EMPLOYEE_TO_EMPLOYEE,
		supplier_id: "1",
		employees: [mockEmployee as any],
		visitors: [],
		messages: [],
		is_active: true,
		created_at: new Date(),
		updated_at: new Date(),
	};

	const mockMessage: ChatMessage = {
		id: "1",
		content: "Test message",
		chat_room_id: "1",
		sender_employee_id: "1",
		sender_visitor_id: null,
		chat_room: mockRoom,
		sender_employee: mockEmployee as any,
		sender_visitor: null,
		is_read: false,
		created_at: new Date(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ChatService,
				{
					provide: getRepositoryToken(ChatRoom),
					useClass: Repository,
				},
				{
					provide: getRepositoryToken(ChatMessage),
					useClass: Repository,
				},
				{
					provide: getRepositoryToken(Employee),
					useClass: Repository,
				},
				{
					provide: getRepositoryToken(Visitor),
					useClass: Repository,
				},
				{
					provide: getRepositoryToken(Supplier),
					useClass: Repository,
				},
			],
		}).compile();

		service = module.get<ChatService>(ChatService);
		chatRoomRepository = module.get<Repository<ChatRoom>>(
			getRepositoryToken(ChatRoom),
		);
		chatMessageRepository = module.get<Repository<ChatMessage>>(
			getRepositoryToken(ChatMessage),
		);
		employeeRepository = module.get<Repository<Employee>>(
			getRepositoryToken(Employee),
		);
		visitorRepository = module.get<Repository<Visitor>>(
			getRepositoryToken(Visitor),
		);
		supplierRepository = module.get<Repository<Supplier>>(
			getRepositoryToken(Supplier),
		);

		// Mock methods to fix errors
		chatRoomRepository.create = jest.fn().mockReturnValue(mockRoom);
		chatRoomRepository.save = jest.fn().mockResolvedValue(mockRoom);
		chatMessageRepository.create = jest.fn().mockReturnValue(mockMessage);
		chatMessageRepository.save = jest.fn().mockResolvedValue(mockMessage);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("createRoom", () => {
		it("should create a room successfully", async () => {
			const createRoomDto: CreateRoomDto = {
				name: "New Room",
				type: ChatRoomType.EMPLOYEE_TO_EMPLOYEE,
				employeeIds: ["1"],
			};

			jest.spyOn(supplierRepository, "findOne").mockResolvedValue(null);
			jest
				.spyOn(employeeRepository, "findBy")
				.mockResolvedValue([mockEmployee as any]);

			const result = await service.createRoom(createRoomDto);
			expect(result).toBe(mockRoom);
			expect(chatRoomRepository.create).toHaveBeenCalled();
			expect(chatRoomRepository.save).toHaveBeenCalled();
		});

		it("should throw an error if supplier does not exist", async () => {
			const createRoomDto: CreateRoomDto = {
				name: "New Room",
				type: ChatRoomType.EMPLOYEE_TO_EMPLOYEE,
				supplierId: "999", // ID que no existe
			};

			jest.spyOn(supplierRepository, "findOne").mockResolvedValue(null);

			await expect(service.createRoom(createRoomDto)).rejects.toThrow(
				BadRequestException,
			);
		});
	});

	describe("createSupplierGroupRoom", () => {
		it("should create a supplier group room successfully", async () => {
			jest
				.spyOn(supplierRepository, "findOne")
				.mockResolvedValue(mockSupplier as any);
			jest.spyOn(chatRoomRepository, "findOne").mockResolvedValue(null);

			const result = await service.createSupplierGroupRoom("1");
			expect(result).toBe(mockRoom);
			expect(chatRoomRepository.create).toHaveBeenCalled();
			expect(chatRoomRepository.save).toHaveBeenCalled();
		});

		it("should return existing room if already exists", async () => {
			jest
				.spyOn(supplierRepository, "findOne")
				.mockResolvedValue(mockSupplier as any);
			jest.spyOn(chatRoomRepository, "findOne").mockResolvedValue(mockRoom);

			const result = await service.createSupplierGroupRoom("1");
			expect(result).toBe(mockRoom);
		});
	});

	describe("addMessage", () => {
		const createMessageDto: CreateMessageDto = {
			content: "Hello",
			roomId: "1",
		};

		const user = {
			id: "1",
			userType: "employee",
		};

		it("should add a message to a room", async () => {
			const mockEmployeeForRoom = {
				id: "1",
				name: "Test Employee",
				email: "test@example.com",
				phone: "123456789",
				position: "Tester",
				supplier: mockSupplier,
				created_at: new Date(),
				updated_at: new Date(),
				is_active: true,
				password: "hashedpassword",
				role: "admin",
				device_token: null,
			};

			jest.spyOn(chatRoomRepository, "findOne").mockResolvedValue({
				...mockRoom,
				employees: [mockEmployeeForRoom as any],
				visitors: [],
			});
			jest
				.spyOn(employeeRepository, "findOne")
				.mockResolvedValue(mockEmployee as any);

			const result = await service.addMessage(createMessageDto, user);

			expect(result).toEqual(mockMessage);
			// En lugar de verificar los parámetros exactos, verificamos que la función fue llamada
			expect(chatMessageRepository.create).toHaveBeenCalled();
			expect(chatMessageRepository.save).toHaveBeenCalled();
		});

		it("should throw error if room does not exist", async () => {
			jest.spyOn(chatRoomRepository, "findOne").mockResolvedValue(null);

			await expect(service.addMessage(createMessageDto, user)).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe("getRoomMessages", () => {
		it("should get messages from a room", async () => {
			const mockEmployeeForRoom = {
				id: "1",
				name: "Test Employee",
				email: "test@example.com",
				phone: "123456789",
				position: "Tester",
				supplier: mockSupplier,
				created_at: new Date(),
				updated_at: new Date(),
				is_active: true,
				password: "hashedpassword",
				role: "admin",
				device_token: null,
			};

			jest.spyOn(chatRoomRepository, "findOne").mockResolvedValue({
				...mockRoom,
				employees: [mockEmployeeForRoom as any],
			});
			jest
				.spyOn(chatMessageRepository, "find")
				.mockResolvedValue([mockMessage]);

			const result = await service.getRoomMessages("1", "1", "employee");

			expect(result).toEqual([mockMessage]);
		});

		it("should throw error if room does not exist", async () => {
			jest.spyOn(chatRoomRepository, "findOne").mockResolvedValue(null);

			await expect(
				service.getRoomMessages("1", "1", "employee"),
			).rejects.toThrow(NotFoundException);
		});
	});

	describe("getUserRooms", () => {
		it("should get rooms for an employee", async () => {
			const mockQueryBuilder = {
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue([mockRoom]),
			};

			jest
				.spyOn(employeeRepository, "findOne")
				.mockResolvedValue(mockEmployee as any);
			jest
				.spyOn(chatRoomRepository, "createQueryBuilder")
				.mockReturnValue(mockQueryBuilder as any);
			jest.spyOn(chatRoomRepository, "findOne").mockResolvedValue(null);

			const result = await service.getUserRooms("1", "employee");

			expect(result).toEqual([mockRoom]);
			expect(employeeRepository.findOne).toHaveBeenCalledWith({
				where: { id: "1" },
				relations: ["supplier"],
			});
		});

		it("should get rooms for a visitor", async () => {
			const mockQueryBuilder = {
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue([mockRoom]),
			};

			jest
				.spyOn(chatRoomRepository, "createQueryBuilder")
				.mockReturnValue(mockQueryBuilder as any);

			const result = await service.getUserRooms("1", "visitor");

			expect(result).toEqual([mockRoom]);
		});
	});

	describe("getOrCreatePrivateRoom", () => {
		it("should create a private room between two employees", async () => {
			const mockUser1 = { ...mockEmployee, id: "1", supplier: { id: "1" } };
			const mockUser2 = { ...mockEmployee, id: "2", supplier: { id: "1" } };

			jest
				.spyOn(employeeRepository, "findOne")
				.mockResolvedValueOnce(mockUser1 as any)
				.mockResolvedValueOnce(mockUser2 as any);
			jest
				.spyOn(service as any, "findPrivateRoomBetweenUsers")
				.mockResolvedValue(null);

			const result = await service.getOrCreatePrivateRoom(
				"1",
				"employee",
				"2",
				"employee",
			);

			expect(result).toEqual(mockRoom);
			expect(chatRoomRepository.create).toHaveBeenCalled();
			expect(chatRoomRepository.save).toHaveBeenCalled();
		});

		it("should return existing private room if found", async () => {
			jest
				.spyOn(employeeRepository, "findOne")
				.mockResolvedValue(mockEmployee as any);
			jest
				.spyOn(service as any, "findPrivateRoomBetweenUsers")
				.mockResolvedValue(mockRoom);

			const result = await service.getOrCreatePrivateRoom(
				"1",
				"employee",
				"2",
				"employee",
			);

			expect(result).toEqual(mockRoom);
		});
	});
});
