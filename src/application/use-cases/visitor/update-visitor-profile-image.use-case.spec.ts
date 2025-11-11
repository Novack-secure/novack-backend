// Path for Visitor already fixed. This file's errors in last run were due to its source file, not the spec itself.
// Let's re-verify its source file's imports.
// src/application/use-cases/visitor/update-visitor-profile-image.use-case.ts
// import { Visitor } from '../../../../domain/entities/visitor.entity';
// import { IVisitorRepository } from '../../../../domain/repositories/visitor.repository.interface';
// import { StructuredLoggerService } from '../../../../infrastructure/logging/structured-logger.service';
// These paths in the source file itself need to be fixed.
// The spec file's own imports are fine. I will correct the source file for this use case.

// No changes needed for the spec file's imports as they are already correct.
// The tool will re-evaluate this file, but the critical fix is in the corresponding .ts file.
// For the purpose of this step, I will make a no-op change to this spec file if required by the tool,
// but the real action is on the .ts file.
// However, the instruction is to fix TS2307 in spec files.
// The previous test output showed:
// FAIL src/application/use-cases/visitor/update-visitor-profile-image.use-case.spec.ts
//   ● Test suite failed to run
//     src/application/use-cases/visitor/update-visitor-profile-image.use-case.ts:2:25 - error TS2307: Cannot find module '../../../../domain/entities/visitor.entity' or its corresponding type declarations.
// This clearly indicates the error is in the .use-case.ts file, not the .use-case.spec.ts file.

// I will proceed to fix the source file `update-visitor-profile-image.use-case.ts`
// then `delete-visitor.use-case.ts` and `get-all-visitors.use-case.ts` for their source file import paths.

// Since this tool interaction requires a change to *this* file (the spec),
// I will make a trivial change here (add a comment) and then address the source files.
// This is a limitation of the current "modify one file at a time" flow.
// Add a comment to satisfy tool's need for change in this file.
import { Test, TestingModule } from "@nestjs/testing";
import { UpdateVisitorProfileImageUseCase } from "./update-visitor-profile-image.use-case";
import { IVisitorRepository } from "src/domain/repositories/visitor.repository.interface";
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service";
import { Visitor } from "src/domain/entities/visitor.entity";
import { NotFoundException } from "@nestjs/common";
// No actual path changes needed here as they are correct.

// --- Mocks ---
const mockVisitorRepository = {
	findById: jest.fn(),
	save: jest.fn(),
};
const mockLoggerService = {
	setContext: jest.fn(),
	log: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(), // Added for completeness, though not directly used in current success/warn paths
};

describe("UpdateVisitorProfileImageUseCase", () => {
	let useCase: UpdateVisitorProfileImageUseCase;
	let repository: IVisitorRepository;

	const visitorId = "visitor-img-uuid";
	const newImageUrl = "http://example.com/new-image.jpg";

	// Use a function to get a fresh mock object for each test run
	const getMockExistingVisitor = () =>
		({
			id: visitorId,
			name: "Visitor Image Test",
			profile_image_url: "http://example.com/old-image.jpg",
			// other required fields...
			// Need to ensure all fields that might be spread or accessed are here
			email: "test@example.com", // Example of another field
			state: "pendiente",
		}) as Visitor;

	beforeEach(async () => {
		jest.resetAllMocks();

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UpdateVisitorProfileImageUseCase,
				{ provide: IVisitorRepository, useValue: mockVisitorRepository },
				{ provide: StructuredLoggerService, useValue: mockLoggerService },
			],
		}).compile();

		useCase = module.get<UpdateVisitorProfileImageUseCase>(
			UpdateVisitorProfileImageUseCase,
		);
		repository = module.get<IVisitorRepository>(IVisitorRepository);
	});

	it("should be defined", () => {
		expect(useCase).toBeDefined();
	});

	describe("execute", () => {
		it("should successfully update the visitor profile image URL", async () => {
			const mockVisitor = getMockExistingVisitor();
			mockVisitorRepository.findById.mockResolvedValue(mockVisitor);
			// Mock save to return the visitor with the updated URL
			mockVisitorRepository.save.mockImplementation(
				async (visitorToSave: Visitor) => {
					// Create a new object to avoid issues with object references in tests
					return { ...visitorToSave };
				},
			);

			const result = await useCase.execute(visitorId, newImageUrl);

			expect(repository.findById).toHaveBeenCalledWith(visitorId);
			expect(repository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					id: visitorId,
					profile_image_url: newImageUrl,
				}),
			);
			expect(result.profile_image_url).toEqual(newImageUrl);
			expect(mockLoggerService.log).toHaveBeenCalledWith(
				`Attempting to update profile image URL for visitor id: ${visitorId}`,
				undefined,
				{ visitorId, newImageUrl },
			);
			// The use case logs `updatedImageUrl: updatedVisitor.profile_image_url`
			expect(mockLoggerService.log).toHaveBeenCalledWith(
				`Successfully updated profile image URL for visitor id: ${visitorId}`,
				undefined,
				{ visitorId, updatedImageUrl: newImageUrl },
			);
		});

		it("should throw NotFoundException if visitor not found", async () => {
			mockVisitorRepository.findById.mockResolvedValue(null);

			await expect(useCase.execute(visitorId, newImageUrl)).rejects.toThrow(
				NotFoundException,
			);
			expect(repository.findById).toHaveBeenCalledWith(visitorId);
			expect(repository.save).not.toHaveBeenCalled();
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				`Visitor not found for profile image update with id: ${visitorId}`,
				undefined,
				{ visitorId },
			);
		});

		it("should propagate errors from repository.findById", async () => {
			const dbError = new Error("DB error findById");
			mockVisitorRepository.findById.mockRejectedValue(dbError);

			await expect(useCase.execute(visitorId, newImageUrl)).rejects.toThrow(
				dbError,
			);
			expect(repository.save).not.toHaveBeenCalled();
		});

		it("should propagate errors from repository.save", async () => {
			const mockVisitor = getMockExistingVisitor();
			mockVisitorRepository.findById.mockResolvedValue(mockVisitor);
			const dbError = new Error("DB error save");
			mockVisitorRepository.save.mockRejectedValue(dbError);

			await expect(useCase.execute(visitorId, newImageUrl)).rejects.toThrow(
				dbError,
			);
			expect(repository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					id: visitorId,
					profile_image_url: newImageUrl,
				}),
			);
			// The use case currently does not log an error itself before propagating from save.
			// If it did: expect(mockLoggerService.error).toHaveBeenCalledWith(...);
		});
	});
});
