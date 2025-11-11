import { Test, TestingModule } from "@nestjs/testing";
import { CreateEmployeeUseCase } from "./create-employee.use-case";
import { IEmployeeRepository } from "src/domain/repositories/employee.repository.interface"; // Fixed
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service"; // Fixed
import { Employee } from "src/domain/entities/employee.entity"; // Fixed
import { CreateEmployeeDto } from "src/application/dtos/employee/create-employee.dto"; // Fixed
import { BadRequestException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";

// Mock bcrypt
jest.mock("bcrypt", () => ({
	hash: jest.fn(),
}));

// Mock IEmployeeRepository
const mockEmployeeRepository = {
	findByEmail: jest.fn(),
	create: jest.fn(),
	// Note: The use case calls IEmployeeRepository.create.
	// The actual EmployeeRepository implementation's create method also saves.
	// If IEmployeeRepository.create was only for instantiation, a .save mock would also be needed.
};

// Mock StructuredLoggerService
const mockLoggerService = {
	setContext: jest.fn(),
	log: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

describe("CreateEmployeeUseCase", () => {
	let useCase: CreateEmployeeUseCase;
	let repository: IEmployeeRepository;
	let logger: StructuredLoggerService;

	const createEmployeeDto: CreateEmployeeDto = {
		first_name: "Test",
		last_name: "User",
		email: "test@example.com",
		password: "password123",
		supplier_id: "supplier-uuid",
		is_creator: false,
		// other fields from DTO if any
	};

	const hashedPassword = "hashed_password_string";
	const mockNewEmployee = {
		id: "new-emp-uuid",
		...createEmployeeDto,
		// password should not be here
		credentials: { password_hash: hashedPassword },
	} as unknown as Employee; // Cast for test purposes

	beforeEach(async () => {
		jest.resetAllMocks();

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				CreateEmployeeUseCase,
				{ provide: IEmployeeRepository, useValue: mockEmployeeRepository },
				{ provide: StructuredLoggerService, useValue: mockLoggerService },
			],
		}).compile();

		useCase = module.get<CreateEmployeeUseCase>(CreateEmployeeUseCase);
		repository = module.get<IEmployeeRepository>(IEmployeeRepository);
		logger = module.get<StructuredLoggerService>(StructuredLoggerService);
	});

	it("should be defined", () => {
		expect(useCase).toBeDefined();
	});

	describe("execute", () => {
		beforeEach(() => {
			// Default successful mock for bcrypt.hash
			(bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
		});

		it("should successfully create an employee if email is unique", async () => {
			mockEmployeeRepository.findByEmail.mockResolvedValue(null); // Email is unique
			mockEmployeeRepository.create.mockResolvedValue(mockNewEmployee);

			const result = await useCase.execute(createEmployeeDto);

			expect(result).toEqual(mockNewEmployee);
			expect(repository.findByEmail).toHaveBeenCalledWith(
				createEmployeeDto.email,
			);
			expect(bcrypt.hash).toHaveBeenCalledWith(createEmployeeDto.password, 10); // 10 is salt rounds from use case
			expect(repository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					email: createEmployeeDto.email,
					credentials: expect.objectContaining({
						password_hash: hashedPassword,
						is_email_verified: false,
						two_factor_enabled: false,
					}),
				}),
			);
			expect(logger.log).toHaveBeenCalledWith(
				"Attempting to create employee account",
				undefined,
				expect.objectContaining({ email: createEmployeeDto.email }),
			);
			expect(logger.log).toHaveBeenCalledWith(
				"Employee account created successfully",
				undefined,
				expect.objectContaining({ employeeId: mockNewEmployee.id }),
			);
		});

		it("should throw BadRequestException if email already exists", async () => {
			mockEmployeeRepository.findByEmail.mockResolvedValue(mockNewEmployee); // Email exists

			await expect(useCase.execute(createEmployeeDto)).rejects.toThrow(
				BadRequestException,
			);
			expect(repository.findByEmail).toHaveBeenCalledWith(
				createEmployeeDto.email,
			);
			expect(bcrypt.hash).not.toHaveBeenCalled();
			expect(repository.create).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				"Employee account creation failed: Email already exists",
				undefined,
				{ email: createEmployeeDto.email },
			);
		});

		it("should propagate error if bcrypt.hash fails", async () => {
			mockEmployeeRepository.findByEmail.mockResolvedValue(null); // Email is unique
			const bcryptError = new Error("bcrypt hashing failed");
			(bcrypt.hash as jest.Mock).mockRejectedValue(bcryptError);

			await expect(useCase.execute(createEmployeeDto)).rejects.toThrow(
				bcryptError,
			);
			expect(repository.create).not.toHaveBeenCalled();
			// Optional: check for an error log if the use case were to catch and log bcrypt errors
			// expect(logger.error).toHaveBeenCalledWith(...);
			// Current use case does not catch this, so it propagates.
		});

		it("should propagate error if repository.create fails", async () => {
			mockEmployeeRepository.findByEmail.mockResolvedValue(null); // Email is unique
			(bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword); // Bcrypt succeeds
			const repoError = new Error("Repository create failed");
			mockEmployeeRepository.create.mockRejectedValue(repoError);

			await expect(useCase.execute(createEmployeeDto)).rejects.toThrow(
				repoError,
			);
			expect(repository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					email: createEmployeeDto.email,
					credentials: expect.objectContaining({
						password_hash: hashedPassword,
					}),
				}),
			);
			// Optional: check for an error log if the use case were to catch and log repo errors
			// expect(logger.error).toHaveBeenCalledWith(...);
			// Current use case does not catch this, so it propagates.
		});
	});
});
