import { Test, TestingModule } from "@nestjs/testing";
import { DeleteVisitorUseCase } from "./delete-visitor.use-case";
import { IVisitorRepository } from "src/domain/repositories/visitor.repository.interface"; // Fixed
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service"; // Fixed
import { NotFoundException } from "@nestjs/common";
import { Visitor } from "src/domain/entities/visitor.entity"; // Fixed

// Mock IVisitorRepository
const mockVisitorRepository = {
	findById: jest.fn(),
	remove: jest.fn(),
};

// Mock StructuredLoggerService
const mockLoggerService = {
	setContext: jest.fn(),
	log: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(), // Potentially if repository.remove() fails and we decide to log it in use case
};

describe("DeleteVisitorUseCase", () => {
	let useCase: DeleteVisitorUseCase;
	let repository: IVisitorRepository;

	const visitorId = "visitor-uuid-to-delete";
	const mockExistingVisitor = {
		id: visitorId,
		name: "Visitor to Delete",
	} as Visitor;

	beforeEach(async () => {
		jest.resetAllMocks(); // Reset all mocks

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DeleteVisitorUseCase,
				{ provide: IVisitorRepository, useValue: mockVisitorRepository },
				{ provide: StructuredLoggerService, useValue: mockLoggerService },
			],
		}).compile();

		useCase = module.get<DeleteVisitorUseCase>(DeleteVisitorUseCase);
		repository = module.get<IVisitorRepository>(IVisitorRepository);
	});

	it("should be defined", () => {
		expect(useCase).toBeDefined();
	});

	describe("execute", () => {
		it("should successfully delete a visitor if found", async () => {
			mockVisitorRepository.findById.mockResolvedValue(mockExistingVisitor);
			mockVisitorRepository.remove.mockResolvedValue(undefined); // remove typically returns void

			await useCase.execute(visitorId);

			expect(repository.findById).toHaveBeenCalledWith(visitorId);
			expect(repository.remove).toHaveBeenCalledWith(mockExistingVisitor);
			expect(mockLoggerService.log).toHaveBeenCalledWith(
				`Attempting to delete visitor with id: ${visitorId}`,
				undefined,
				{ visitorId },
			);
			expect(mockLoggerService.log).toHaveBeenCalledWith(
				`Successfully deleted visitor with id: ${visitorId}`,
				undefined,
				{ visitorId },
			);
		});

		it("should throw NotFoundException if visitor to delete is not found", async () => {
			mockVisitorRepository.findById.mockResolvedValue(null);

			await expect(useCase.execute(visitorId)).rejects.toThrow(
				NotFoundException,
			);
			expect(repository.findById).toHaveBeenCalledWith(visitorId);
			expect(repository.remove).not.toHaveBeenCalled(); // Ensure remove is not called
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				`Visitor not found for deletion with id: ${visitorId}`,
				undefined,
				{ visitorId },
			);
		});

		it("should propagate errors from repository.findById", async () => {
			const dbError = new Error("Database findById error");
			mockVisitorRepository.findById.mockRejectedValue(dbError);

			await expect(useCase.execute(visitorId)).rejects.toThrow(dbError);
			expect(repository.remove).not.toHaveBeenCalled();
		});

		it("should propagate errors from repository.remove", async () => {
			const dbError = new Error("Database remove error");
			mockVisitorRepository.findById.mockResolvedValue(mockExistingVisitor); // Visitor is found
			mockVisitorRepository.remove.mockRejectedValue(dbError); // remove fails

			await expect(useCase.execute(visitorId)).rejects.toThrow(dbError);
			expect(repository.remove).toHaveBeenCalledWith(mockExistingVisitor);
			// The current DeleteVisitorUseCase does not have a try/catch around repository.remove,
			// so it won't log an error itself before propagating. GlobalExceptionFilter would handle logging.
			// If we added a try/catch in the use case:
			// expect(mockLoggerService.error).toHaveBeenCalledWith('Failed to delete visitor from repository', { visitorId, error: dbError.message });
		});
	});
});
