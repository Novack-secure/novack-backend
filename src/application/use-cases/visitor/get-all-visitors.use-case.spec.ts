import { Test, TestingModule } from '@nestjs/testing';
import { GetAllVisitorsUseCase } from './get-all-visitors.use-case';
import { IVisitorRepository } from 'src/domain/repositories/visitor.repository.interface'; // Fixed
import { StructuredLoggerService } from 'src/infrastructure/logging/structured-logger.service'; // Fixed
import { Visitor } from 'src/domain/entities/visitor.entity'; // Fixed

// Mock IVisitorRepository
const mockVisitorRepository = {
  findAll: jest.fn(),
  // Add findById if it were used, but it's not for this use case
};

// Mock StructuredLoggerService
const mockLoggerService = {
  setContext: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(), // Not strictly needed for this use case's success path
  error: jest.fn(), // Not strictly needed for this use case's success path
  debug: jest.fn(),
};

describe('GetAllVisitorsUseCase', () => {
  let useCase: GetAllVisitorsUseCase;
  let repository: IVisitorRepository;

  beforeEach(async () => {
    mockVisitorRepository.findAll.mockReset();
    mockLoggerService.log.mockReset();
    // Reset other mocks if they were used e.g. warn, error
    mockLoggerService.warn.mockReset();
    mockLoggerService.error.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllVisitorsUseCase,
        { provide: IVisitorRepository, useValue: mockVisitorRepository },
        { provide: StructuredLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    useCase = module.get<GetAllVisitorsUseCase>(GetAllVisitorsUseCase);
    repository = module.get<IVisitorRepository>(IVisitorRepository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    const mockVisitorsResult: Visitor[] = [
      {
        id: 'visitor-uuid-1',
        name: 'Visitor One',
        email: 'one@example.com',
        state: 'pendiente',
      } as Visitor,
      {
        id: 'visitor-uuid-2',
        name: 'Visitor Two',
        email: 'two@example.com',
        state: 'en_progreso',
      } as Visitor,
    ];

    it('should return an array of visitors if found', async () => {
      mockVisitorRepository.findAll.mockResolvedValue(mockVisitorsResult);

      const result = await useCase.execute();

      expect(result).toEqual(mockVisitorsResult);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        'Attempting to fetch all visitors.',
      );
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `Successfully fetched ${mockVisitorsResult.length} visitors.`,
        undefined,
        { count: mockVisitorsResult.length },
      );
    });

    it('should return an empty array if no visitors are found', async () => {
      mockVisitorRepository.findAll.mockResolvedValue([]);

      const result = await useCase.execute();

      expect(result).toEqual([]);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        'Attempting to fetch all visitors.',
      );
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        'Successfully fetched 0 visitors.',
        undefined,
        { count: 0 },
      );
    });

    it('should log an attempt to fetch all visitors', async () => {
      mockVisitorRepository.findAll.mockResolvedValue([]); // Does not matter what it returns for this test
      await useCase.execute();
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        'Attempting to fetch all visitors.',
      );
    });

    it('should propagate errors from the repository', async () => {
      const errorMessage = 'Database error';
      // Mock it to be called multiple times for each expect call
      mockVisitorRepository.findAll
        .mockRejectedValueOnce(new Error(errorMessage))
        .mockRejectedValueOnce(new Error(errorMessage));

      await expect(useCase.execute()).rejects.toThrow(Error);
      await expect(useCase.execute()).rejects.toThrow(errorMessage);
      expect(repository.findAll).toHaveBeenCalledTimes(2); // Called twice due to two expects
      // Note: The use case doesn't have specific error logging for findAll, it relies on global error handling.
    });
  });
});
