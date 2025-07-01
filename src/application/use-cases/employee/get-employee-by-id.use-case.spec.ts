import { Test, TestingModule } from "@nestjs/testing";
import { GetEmployeeByIdUseCase } from "./get-employee-by-id.use-case";
import { IEmployeeRepository } from "src/domain/repositories/employee.repository.interface"; // Fixed
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service"; // Fixed
import { NotFoundException } from "@nestjs/common";
import { Employee } from "src/domain/entities/employee.entity"; // Fixed
import { Supplier } from "src/domain/entities/supplier.entity"; // Fixed
import { EmployeeCredentials } from "src/domain/entities/employee-credentials.entity"; // Fixed

// Mock IEmployeeRepository
const mockEmployeeRepository = {
	findById: jest.fn(),
	// Other methods not needed for this specific use case test
};

// Mock StructuredLoggerService
const mockLoggerService = {
	setContext: jest.fn(),
	log: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	debug: jest.fn(),
};

describe("GetEmployeeByIdUseCase", () => {
	let useCase: GetEmployeeByIdUseCase;
	let repository: IEmployeeRepository;
	// Keep a direct reference to the logger mock to check calls on it
	let logger: StructuredLoggerService;

	beforeEach(async () => {
		jest.resetAllMocks(); // Reset all mocks before each test

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GetEmployeeByIdUseCase,
				// Use the actual IEmployeeRepository symbol (imported) as the provide token
				{ provide: IEmployeeRepository, useValue: mockEmployeeRepository },
				{ provide: StructuredLoggerService, useValue: mockLoggerService },
			],
		}).compile();

		useCase = module.get<GetEmployeeByIdUseCase>(GetEmployeeByIdUseCase);
		// Use the actual IEmployeeRepository symbol for getting the instance
		repository = module.get<IEmployeeRepository>(IEmployeeRepository);
		logger = module.get<StructuredLoggerService>(StructuredLoggerService);
	});

	it("should be defined", () => {
		expect(useCase).toBeDefined();
	});

	describe("execute", () => {
		const employeeId = "test-employee-uuid";
		const mockEmployeeResult: Employee = {
			id: employeeId,
			first_name: "Test",
			last_name: "Employee",
			email: "test@example.com",
			phone: "1234567890",
			profile_image_url: null,
			is_creator: false,
			supplier_id: "supplier-uuid",
			created_at: new Date(),
			updated_at: new Date(),
			deleted_at: null,
			supplier: {
				id: "supplier-uuid",
				supplier_name: "Test Supplier",
			} as Supplier,
			credentials: {
				id: "cred-uuid",
				employee_id: employeeId,
				is_email_verified: true,
			} as EmployeeCredentials,
			cards: [], // Added missing required field
			chat_rooms: [], // Added missing required field
			// other necessary fields or relations
		} as Employee;

		it("should return employee details if employee is found", async () => {
			mockEmployeeRepository.findById.mockResolvedValue(mockEmployeeResult);

			const result = await useCase.execute(employeeId);

			expect(result).toEqual(mockEmployeeResult);
			expect(repository.findById).toHaveBeenCalledWith(employeeId);
			expect(logger.log).toHaveBeenCalledWith(
				`Attempting to fetch employee with id: ${employeeId}`,
				undefined,
				{ employeeId },
			);
			// The use case logs only employeeId on success
			expect(logger.log).toHaveBeenCalledWith(
				`Successfully fetched employee with id: ${employeeId}`,
				undefined,
				{ employeeId },
			);
		});

		it("should throw NotFoundException if employee is not found", async () => {
			mockEmployeeRepository.findById.mockResolvedValue(null);

			await expect(useCase.execute(employeeId)).rejects.toThrow(
				NotFoundException,
			);
			expect(repository.findById).toHaveBeenCalledWith(employeeId);
			expect(logger.warn).toHaveBeenCalledWith(
				`Employee not found with id: ${employeeId}`,
				undefined,
				{ employeeId },
			);
		});

		it("should log an attempt to fetch employee details", async () => {
			mockEmployeeRepository.findById.mockResolvedValue(mockEmployeeResult); // Ensure it doesn't throw for this test
			await useCase.execute(employeeId);
			expect(logger.log).toHaveBeenCalledWith(
				`Attempting to fetch employee with id: ${employeeId}`,
				undefined,
				{ employeeId },
			);
		});

		it("should propagate an unexpected error from repository.findById", async () => {
			const errorMessage = "Database connection error";
			mockEmployeeRepository.findById.mockRejectedValue(
				new Error(errorMessage),
			);

			// Check that the execute method is called twice for the two expects
			mockEmployeeRepository.findById.mockClear(); // Clear previous calls if any
			mockEmployeeRepository.findById
				.mockRejectedValueOnce(new Error(errorMessage))
				.mockRejectedValueOnce(new Error(errorMessage));

			await expect(useCase.execute(employeeId)).rejects.toThrow(Error);
			// To specifically check for the message, ensure the error is an instance of Error
			try {
				await useCase.execute(employeeId);
			} catch (e) {
				expect(e.message).toBe(errorMessage);
			}

			expect(repository.findById).toHaveBeenCalledWith(employeeId);
			expect(repository.findById).toHaveBeenCalledTimes(2);
			// The use case does not have specific try-catch for repository errors,
			// so it won't log an error itself; it relies on a global exception filter.
		});
	});
});
