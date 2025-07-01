import { Test, TestingModule } from '@nestjs/testing';
import { GetVisitorDetailsUseCase } from './get-visitor-details.use-case';
import { IVisitorRepository } from 'src/domain/repositories/visitor.repository.interface'; // Fixed path
import { StructuredLoggerService } from 'src/infrastructure/logging/structured-logger.service';
import { NotFoundException } from '@nestjs/common';
import { Visitor } from 'src/domain/entities/visitor.entity';
import { Appointment } from 'src/domain/entities/appointment.entity'; // Path was already correct
import { Supplier } from 'src/domain/entities/supplier.entity';
// No change needed here, paths are correct. Adding a comment for the tool.
// Mock IVisitorRepository
const mockVisitorRepository = {
  findById: jest.fn(),
  // No need to mock other methods unless this specific use case starts using them
};

// Mock StructuredLoggerService
const mockLoggerService = {
  setContext: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('GetVisitorDetailsUseCase', () => {
  let useCase: GetVisitorDetailsUseCase;
  let repository: IVisitorRepository; // For easier access to mock in tests

  beforeEach(async () => {
    // Reset mocks before each test
    mockVisitorRepository.findById.mockReset();
    mockLoggerService.log.mockReset();
    mockLoggerService.warn.mockReset();
    // ... reset other mock functions ...

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetVisitorDetailsUseCase,
        { provide: IVisitorRepository, useValue: mockVisitorRepository },
        { provide: StructuredLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    useCase = module.get<GetVisitorDetailsUseCase>(GetVisitorDetailsUseCase);
    repository = module.get<IVisitorRepository>(IVisitorRepository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    const visitorId = 'test-visitor-uuid';
    // Define a more complete mock result, including potential relations
    const mockVisitorResult: Visitor = {
      id: visitorId,
      name: 'Test Visitor',
      email: 'test@example.com',
      phone: '1234567890',
      location: 'Test Location',
      state: 'pendiente',
      profile_image_url: null,
      supplier_id: 'supplier-uuid',
      created_at: new Date(),
      updated_at: new Date(),
      additional_info: {}, // Added missing required field
      appointments: [
        { id: 'appt-uuid', title: 'Test Appointment' } as Appointment,
      ],
      supplier: {
        id: 'supplier-uuid',
        supplier_name: 'Test Supplier',
      } as Supplier,
      card: null, // or mock a card if necessary
    } as Visitor;

    it('should return visitor details if visitor is found', async () => {
      mockVisitorRepository.findById.mockResolvedValue(mockVisitorResult);

      const result = await useCase.execute(visitorId);

      expect(result).toEqual(mockVisitorResult);
      expect(repository.findById).toHaveBeenCalledWith(visitorId);
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `Attempting to fetch visitor details for id: ${visitorId}`,
        undefined,
        { visitorId },
      );
      // The use case log currently doesn't include visitorName, so adjusting the expectation
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `Successfully fetched visitor details for id: ${visitorId}`,
        undefined,
        { visitorId }, // Original use case logs only { visitorId } on success
      );
    });

    it('should throw NotFoundException if visitor is not found', async () => {
      mockVisitorRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(visitorId)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.findById).toHaveBeenCalledWith(visitorId);
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        `Visitor not found with id: ${visitorId}`,
        undefined,
        { visitorId },
      );
    });

    it('should log an attempt to fetch visitor details', async () => {
      // Ensure the mock doesn't cause an error during the call if findById throws
      mockVisitorRepository.findById.mockResolvedValue(mockVisitorResult);
      await useCase.execute(visitorId);
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `Attempting to fetch visitor details for id: ${visitorId}`,
        undefined,
        { visitorId },
      );
    });

    // Add more tests if there are specific conditions or edge cases for this use case
    // For example, testing behavior if repository.findById throws an unexpected error
    it('should propagate an unexpected error from repository', async () => {
      const errorMessage = 'Database connection error';
      mockVisitorRepository.findById.mockRejectedValue(new Error(errorMessage));

      await expect(useCase.execute(visitorId)).rejects.toThrow(Error);
      await expect(useCase.execute(visitorId)).rejects.toThrow(errorMessage);
      expect(repository.findById).toHaveBeenCalledWith(visitorId);
      // Optionally, check if an error log was made by the use case if it had try/catch
      // (current GetVisitorDetailsUseCase does not have try/catch for this, relies on global handler)
    });
  });
});
