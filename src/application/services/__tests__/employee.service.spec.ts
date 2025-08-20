import { Test, TestingModule } from "@nestjs/testing";
import { EmployeeService } from "../employee.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Employee, Supplier } from "src/domain/entities";
import { EmployeeCredentials } from "src/domain/entities/employee-credentials.entity";
import { BadRequestException } from "@nestjs/common";
import { CreateEmployeeDto, UpdateEmployeeDto } from "../../dtos/employee";
import * as bcrypt from "bcryptjs";
import { IEmployeeRepository } from "../../../domain/repositories/employee.repository.interface";
import { StructuredLoggerService } from "../../../infrastructure/logging/structured-logger.service"; // Added import

// Define mock for StructuredLoggerService
const mockLoggerService = {
	setContext: jest.fn(),
	log: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	debug: jest.fn(),
	verbose: jest.fn(),
};

describe("EmployeeService", () => {
	let service: EmployeeService;
	let employeeRepositoryMock: IEmployeeRepository;
	// Removed logger declaration here as it's not assigned or used at this scope in other similar spec files

	// Mock data
	const mockSupplier = {
		id: "1",
		name: "Test Supplier",
		subscription: { id: "1" },
	};

	const mockEmployee = {
		id: "1",
		first_name: "John",
		last_name: "Doe",
		email: "john@example.com",
		supplier_id: "1",
		supplier: mockSupplier,
		credentials: {
			id: "1",
			password_hash: "hashedpassword",
			is_email_verified: false,
			employee_id: "1",
			two_factor_enabled: false,
		},
	};

	const mockCreateEmployeeDto: CreateEmployeeDto = {
		first_name: "New",
		last_name: "Employee",
		email: "new@example.com",
		password: "password123",
		supplier_id: "1",
	};

	const mockUpdateEmployeeDto: UpdateEmployeeDto = {
		first_name: "Updated",
		last_name: "Name",
		email: "updated@example.com",
		password: "newpassword123",
		phone: "1111111111",
		position: "Senior Designer",
		department: "Design",
	};

	beforeEach(async () => {
		employeeRepositoryMock = {
			findAll: jest.fn().mockResolvedValue([mockEmployee]),
			findById: jest.fn().mockResolvedValue(mockEmployee),
			findByEmail: jest.fn().mockResolvedValue(null),
			create: jest.fn().mockResolvedValue(mockEmployee),
			update: jest.fn().mockResolvedValue(mockEmployee),
			delete: jest.fn().mockResolvedValue(undefined),
			findBySupplier: jest.fn().mockResolvedValue([mockEmployee]),
			updateCredentials: jest.fn().mockResolvedValue(undefined),
			findByVerificationToken: jest.fn().mockResolvedValue(mockEmployee),
			findByResetToken: jest.fn().mockResolvedValue(mockEmployee),
			save: jest.fn().mockResolvedValue(mockEmployee),
			findByEmailWithCredentialsAndPhone: jest
				.fn()
				.mockResolvedValue(mockEmployee),
			findByIdWithCredentialsAndPhone: jest
				.fn()
				.mockResolvedValue(mockEmployee),
			findByIdWithCredentials: jest.fn().mockResolvedValue(mockEmployee),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				EmployeeService,
				{
					provide: "IEmployeeRepository",
					useValue: employeeRepositoryMock,
				},
				{
					// Added provider for StructuredLoggerService
					provide: StructuredLoggerService,
					useValue: mockLoggerService,
				},
			],
		}).compile();

		service = module.get<EmployeeService>(EmployeeService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("create", () => {
		it("should create a new employee successfully", async () => {
			// Mock password hash
			jest.spyOn(bcrypt, "hash").mockResolvedValue("hashedpassword" as never);

			// Setup repository mock to return null when checking for existing email
			employeeRepositoryMock.findByEmail = jest.fn().mockResolvedValue(null);

			// Call method
			const result = await service.create(mockCreateEmployeeDto);

			// Assert results
			expect(result).toEqual(mockEmployee);
			expect(employeeRepositoryMock.findByEmail).toHaveBeenCalledWith(
				mockCreateEmployeeDto.email,
			);
			expect(employeeRepositoryMock.create).toHaveBeenCalled();
			expect(bcrypt.hash).toHaveBeenCalledWith(
				mockCreateEmployeeDto.password,
				10,
			);
		});

		it("should throw error if email already exists", async () => {
			// Mock the email check to return an existing employee
			employeeRepositoryMock.findByEmail = jest
				.fn()
				.mockResolvedValue(mockEmployee);

			// Assert that the method throws the correct exception
			await expect(service.create(mockCreateEmployeeDto)).rejects.toThrow(
				BadRequestException,
			);
			expect(employeeRepositoryMock.findByEmail).toHaveBeenCalledWith(
				mockCreateEmployeeDto.email,
			);
		});
	});

	describe("findAll", () => {
		it("should return an array of employees", async () => {
			const result = await service.findAll();

			expect(result).toEqual([mockEmployee]);
			expect(employeeRepositoryMock.findAll).toHaveBeenCalled();
		});
	});

	describe("findOne", () => {
		it("should return a single employee by id", async () => {
			const result = await service.findOne("1");

			expect(result).toEqual(mockEmployee);
			expect(employeeRepositoryMock.findById).toHaveBeenCalledWith("1");
		});

		it("should throw exception if employee not found", async () => {
			employeeRepositoryMock.findById = jest.fn().mockResolvedValue(null);

			await expect(service.findOne("1")).rejects.toThrow(BadRequestException);
		});
	});

	describe("update", () => {
		it("should update an employee successfully", async () => {
			// Mock password hash
			jest.spyOn(bcrypt, "hash").mockResolvedValue("newhashpassword" as never);

			// Setup repository mock
			const updatedEmployee = {
				...mockEmployee,
				first_name: mockUpdateEmployeeDto.first_name,
				last_name: mockUpdateEmployeeDto.last_name,
				email: mockUpdateEmployeeDto.email,
				phone: mockUpdateEmployeeDto.phone,
				position: mockUpdateEmployeeDto.position,
				department: mockUpdateEmployeeDto.department,
			};

			employeeRepositoryMock.update = jest
				.fn()
				.mockResolvedValue(updatedEmployee);

			// Call the method
			const result = await service.update("1", mockUpdateEmployeeDto);

			// Assert the result
			expect(result).toEqual(updatedEmployee);
			expect(employeeRepositoryMock.findById).toHaveBeenCalledWith("1");

			// If password is included, should update credentials
			if (mockUpdateEmployeeDto.password) {
				expect(bcrypt.hash).toHaveBeenCalledWith(
					mockUpdateEmployeeDto.password,
					10,
				);
				expect(employeeRepositoryMock.updateCredentials).toHaveBeenCalled();
			}

			expect(employeeRepositoryMock.update).toHaveBeenCalled();
		});

		it("should throw error if employee not found", async () => {
			employeeRepositoryMock.findById = jest.fn().mockResolvedValue(null);

			await expect(service.update("1", mockUpdateEmployeeDto)).rejects.toThrow(
				BadRequestException,
			);
		});
	});

	describe("remove", () => {
		it("should remove an employee successfully", async () => {
			const result = await service.remove("1");

			expect(employeeRepositoryMock.findById).toHaveBeenCalledWith("1");
			expect(employeeRepositoryMock.delete).toHaveBeenCalledWith("1");
		});

		it("should throw error if employee not found", async () => {
			employeeRepositoryMock.findById = jest.fn().mockResolvedValue(null);

			await expect(service.remove("1")).rejects.toThrow(BadRequestException);
		});
	});

	describe("findBySupplier", () => {
		it("should return employees for a specific supplier", async () => {
			const result = await service.findBySupplier("1");

			expect(result).toEqual([mockEmployee]);
			expect(employeeRepositoryMock.findBySupplier).toHaveBeenCalledWith("1");
		});
	});

	describe("verifyEmail", () => {
		it("should verify an employee email", async () => {
			// Call the method
			const result = await service.verifyEmail("1");

			// Assert the result
			expect(employeeRepositoryMock.findById).toHaveBeenCalledWith("1");
			expect(employeeRepositoryMock.updateCredentials).toHaveBeenCalledWith(
				"1",
				{
					is_email_verified: true,
					verification_token: null,
				},
			);
		});

		it("should throw error if employee not found", async () => {
			employeeRepositoryMock.findById = jest.fn().mockResolvedValue(null);

			await expect(service.verifyEmail("1")).rejects.toThrow(
				BadRequestException,
			);
		});
	});
});
