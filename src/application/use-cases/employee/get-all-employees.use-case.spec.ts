import { Test, TestingModule } from '@nestjs/testing';
import { GetAllEmployeesUseCase } from './get-all-employees.use-case';
import { IEmployeeRepository } from 'src/domain/repositories/employee.repository.interface'; // Fixed
import { StructuredLoggerService } from 'src/infrastructure/logging/structured-logger.service'; // Fixed
import { Employee } from 'src/domain/entities/employee.entity'; // Fixed

// Mock IEmployeeRepository
const mockEmployeeRepository = {
  findAll: jest.fn(),
};

// Mock StructuredLoggerService
const mockLoggerService = {
  setContext: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('GetAllEmployeesUseCase', () => {
  let useCase: GetAllEmployeesUseCase;
  let repository: IEmployeeRepository;
  let logger: StructuredLoggerService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllEmployeesUseCase,
        { provide: IEmployeeRepository, useValue: mockEmployeeRepository },
        { provide: StructuredLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    useCase = module.get<GetAllEmployeesUseCase>(GetAllEmployeesUseCase);
    repository = module.get<IEmployeeRepository>(IEmployeeRepository);
    logger = module.get<StructuredLoggerService>(StructuredLoggerService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    const mockEmployeesResult: Employee[] = [
      {
        id: 'emp-uuid-1',
        first_name: 'Employee',
        last_name: 'One',
        email: 'one@example.com',
      } as Employee,
      {
        id: 'emp-uuid-2',
        first_name: 'Employee',
        last_name: 'Two',
        email: 'two@example.com',
      } as Employee,
    ];

    it('should return an array of employees if found', async () => {
      mockEmployeeRepository.findAll.mockResolvedValue(mockEmployeesResult);

      const result = await useCase.execute();

      expect(result).toEqual(mockEmployeesResult);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith(
        'Attempting to fetch all employees.',
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Successfully fetched ${mockEmployeesResult.length} employees.`,
        undefined, // Added undefined for context
        { count: mockEmployeesResult.length },
      );
    });

    it('should return an empty array if no employees are found', async () => {
      mockEmployeeRepository.findAll.mockResolvedValue([]);

      const result = await useCase.execute();

      expect(result).toEqual([]);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith(
        'Attempting to fetch all employees.',
      );
      expect(logger.log).toHaveBeenCalledWith(
        'Successfully fetched 0 employees.',
        undefined, // Added undefined for context
        { count: 0 },
      );
    });

    it('should log an attempt to fetch all employees', async () => {
      mockEmployeeRepository.findAll.mockResolvedValue([]); // Outcome doesn't matter for this test
      await useCase.execute();
      // For a single-argument call, the check is fine as is.
      expect(logger.log).toHaveBeenCalledWith(
        'Attempting to fetch all employees.',
      );
    });

    it('should propagate errors from the repository.findAll method', async () => {
      const errorMessage = 'Database connection error during findAll';
      // Ensure multiple calls to execute will get a fresh rejection for each
      mockEmployeeRepository.findAll.mockClear();
      mockEmployeeRepository.findAll
        .mockRejectedValueOnce(new Error(errorMessage))
        .mockRejectedValueOnce(new Error(errorMessage));

      await expect(useCase.execute()).rejects.toThrow(Error);
      try {
        await useCase.execute();
      } catch (e) {
        expect(e.message).toBe(errorMessage);
      }

      expect(repository.findAll).toHaveBeenCalledTimes(2);
      // The use case itself does not log errors from repository, relies on global handler
    });
  });
});
