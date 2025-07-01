import { Test, TestingModule } from "@nestjs/testing";
import { UpdateVisitorAndAppointmentUseCase } from "./update-visitor-and-appointment.use-case";
import { IVisitorRepository } from "src/domain/repositories/visitor.repository.interface";
import { IAppointmentRepository } from "src/domain/repositories/appointment.repository.interface";
import { ISupplierRepository } from "src/domain/repositories/supplier.repository.interface";
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service";
import { UpdateVisitorDto } from "src/application/dtos/visitor/update-visitor.dto";
import { Visitor } from "src/domain/entities/visitor.entity";
import { Appointment } from "src/domain/entities/appointment.entity"; // Path was already correct here
import { Supplier } from "src/domain/entities/supplier.entity";
import { BadRequestException, NotFoundException } from "@nestjs/common";
// The TS2307 for Appointment was in other files, this one seems to have it correct.
// Making a no-op change to satisfy the tool if it insists on a change for this file.
// Adding a comment.

// --- Mocks ---
const mockVisitorRepository = {
	findById: jest.fn(),
	save: jest.fn(),
};
const mockAppointmentRepository = {
	findById: jest.fn(), // For explicitly fetching the appointment
	save: jest.fn(),
};
const mockSupplierRepository = {
	findById: jest.fn(),
};
const mockLoggerService = {
	setContext: jest.fn(),
	log: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

describe("UpdateVisitorAndAppointmentUseCase", () => {
	let useCase: UpdateVisitorAndAppointmentUseCase;
	let visitorRepo: IVisitorRepository;
	let appointmentRepo: IAppointmentRepository;
	let supplierRepo: ISupplierRepository;

	const visitorId = "visitor-uuid";
	const mockExistingAppointment = {
		id: "appt-uuid",
		title: "Old Appointment",
		check_in_time: new Date("2024-01-01T10:00:00Z"),
		check_out_time: new Date("2024-01-01T11:00:00Z"),
		status: "pendiente",
		// other fields...
	} as Appointment;

	const mockExistingVisitor = {
		id: visitorId,
		name: "Old Name",
		email: "old@example.com",
		phone: "1234567890",
		location: "Old Location",
		state: "pendiente",
		profile_image_url: null,
		additional_info: {}, // Added
		created_at: new Date("2023-01-01T10:00:00Z"), // Added
		updated_at: new Date("2023-01-01T10:00:00Z"), // Added
		appointments: [mockExistingAppointment],
		supplier_id: "old-supplier-uuid",
		supplier: {
			id: "old-supplier-uuid",
			supplier_name: "Old Supplier",
		} as Supplier,
		card: null, // Added
	} as Visitor;

	const mockFetchedAppointmentFull = {
		...mockExistingAppointment,
		// ensure all fields needed for update logic are present
	} as Appointment;

	const updateDto: UpdateVisitorDto = {
		name: "New Name",
		email: "new@example.com",
		phone: "0987654321",
		location: "New Location",
		state: "en_progreso",
		supplier_id: "new-supplier-uuid",
		appointment: "New Appointment Title",
		appointment_description: "New Description",
		check_in_time: new Date("2024-01-02T10:00:00Z"),
		check_out_time: new Date("2024-01-02T11:00:00Z"),
		complaints: { guestUpdated: "minor issue" },
	};

	const mockNewSupplier = {
		id: "new-supplier-uuid",
		supplier_name: "New Supplier",
	} as Supplier;

	beforeEach(async () => {
		jest.resetAllMocks();

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UpdateVisitorAndAppointmentUseCase,
				{ provide: IVisitorRepository, useValue: mockVisitorRepository },
				{
					provide: IAppointmentRepository,
					useValue: mockAppointmentRepository,
				},
				{ provide: ISupplierRepository, useValue: mockSupplierRepository },
				{ provide: StructuredLoggerService, useValue: mockLoggerService },
			],
		}).compile();

		useCase = module.get<UpdateVisitorAndAppointmentUseCase>(
			UpdateVisitorAndAppointmentUseCase,
		);
		visitorRepo = module.get<IVisitorRepository>(IVisitorRepository);
		appointmentRepo = module.get<IAppointmentRepository>(
			IAppointmentRepository,
		);
		supplierRepo = module.get<ISupplierRepository>(ISupplierRepository);
	});

	it("should be defined", () => {
		expect(useCase).toBeDefined();
	});

	describe("execute", () => {
		// Helper to create a deep copy of mock objects for mutation within tests if needed
		const getClonedMockExistingVisitor = () =>
			JSON.parse(JSON.stringify(mockExistingVisitor)) as Visitor;
		const getClonedMockFetchedAppointmentFull = () =>
			JSON.parse(JSON.stringify(mockFetchedAppointmentFull)) as Appointment;

		beforeEach(() => {
			// Default successful mock implementations
			// Ensure dates are proper Date objects after cloning if necessary
			let clonedVisitor = getClonedMockExistingVisitor();
			clonedVisitor.appointments = [getClonedMockFetchedAppointmentFull()];
			clonedVisitor.appointments[0].check_in_time = new Date(
				clonedVisitor.appointments[0].check_in_time,
			);
			clonedVisitor.appointments[0].check_out_time = new Date(
				clonedVisitor.appointments[0].check_out_time,
			);

			mockVisitorRepository.findById.mockResolvedValue(clonedVisitor);
			mockAppointmentRepository.findById.mockResolvedValue(
				getClonedMockFetchedAppointmentFull(),
			);
			mockSupplierRepository.findById.mockResolvedValue(mockNewSupplier);

			// Mock save to return the entity that was passed in, simulating a successful save
			mockVisitorRepository.save.mockImplementation((v) =>
				Promise.resolve(v as Visitor),
			);
			mockAppointmentRepository.save.mockImplementation((a) =>
				Promise.resolve(a as Appointment),
			);

			// Default for final re-fetch
			// This will be overridden in the success test for more specific assertion
			mockVisitorRepository.findById
				.mockResolvedValueOnce(clonedVisitor) // for initial load
				.mockResolvedValueOnce(clonedVisitor); // for final re-fetch (default)
		});

		it("should successfully update visitor and appointment details", async () => {
			const initialVisitor = getClonedMockExistingVisitor();
			initialVisitor.appointments = [getClonedMockFetchedAppointmentFull()];
			initialVisitor.appointments[0].check_in_time = new Date(
				initialVisitor.appointments[0].check_in_time,
			);
			if (initialVisitor.appointments[0].check_out_time)
				initialVisitor.appointments[0].check_out_time = new Date(
					initialVisitor.appointments[0].check_out_time,
				);

			const finalCheckInTime = new Date(updateDto.check_in_time);
			const finalCheckOutTime = new Date(updateDto.check_out_time);

			const expectedSavedVisitor = {
				...initialVisitor,
				name: updateDto.name,
				email: updateDto.email,
				phone: updateDto.phone,
				location: updateDto.location,
				state: updateDto.state,
				supplier: mockNewSupplier,
				supplier_id: mockNewSupplier.id,
			};
			const expectedSavedAppointment = {
				...initialVisitor.appointments[0],
				title: updateDto.appointment,
				description: updateDto.appointment_description,
				check_in_time: finalCheckInTime,
				check_out_time: finalCheckOutTime,
				status: updateDto.state,
				supplier: mockNewSupplier,
				complaints: updateDto.complaints,
			};

			// This is what the final findById should return
			const expectedFinalVisitorResult = {
				...expectedSavedVisitor,
				appointments: [expectedSavedAppointment],
			} as Visitor;

			mockVisitorRepository.findById
				.mockReset()
				.mockResolvedValueOnce(initialVisitor)
				.mockResolvedValueOnce(expectedFinalVisitorResult);
			mockAppointmentRepository.findById.mockResolvedValueOnce(
				getClonedMockFetchedAppointmentFull(),
			);
			mockSupplierRepository.findById.mockResolvedValueOnce(mockNewSupplier);
			mockVisitorRepository.save.mockResolvedValue(
				expectedSavedVisitor as Visitor,
			);
			mockAppointmentRepository.save.mockResolvedValue(
				expectedSavedAppointment as Appointment,
			);

			const result = await useCase.execute(visitorId, updateDto);

			expect(result).toEqual(expectedFinalVisitorResult);
			expect(visitorRepo.findById).toHaveBeenCalledWith(visitorId);
			expect(appointmentRepo.findById).toHaveBeenCalledWith(
				mockExistingAppointment.id,
			);
			expect(supplierRepo.findById).toHaveBeenCalledWith(updateDto.supplier_id);

			expect(visitorRepo.save).toHaveBeenCalledWith(
				expect.objectContaining({
					name: updateDto.name,
					email: updateDto.email,
					phone: updateDto.phone,
					location: updateDto.location,
					state: updateDto.state,
					supplier_id: mockNewSupplier.id,
				}),
			);
			expect(appointmentRepo.save).toHaveBeenCalledWith(
				expect.objectContaining({
					title: updateDto.appointment,
					description: updateDto.appointment_description,
					check_in_time: finalCheckInTime,
					check_out_time: finalCheckOutTime,
					status: updateDto.state,
					complaints: updateDto.complaints,
				}),
			);
			expect(visitorRepo.findById).toHaveBeenCalledTimes(2); // Initial load + final re-fetch

			expect(mockLoggerService.log).toHaveBeenCalledWith(
				`Attempting to update visitor and associated appointment`,
				undefined,
				undefined,
				{ visitorId: visitorId, updateData: updateDto },
			);
			expect(mockLoggerService.log).toHaveBeenCalledWith(
				"Visitor entity updated successfully",
				undefined,
				undefined,
				{ visitorId: visitorId },
			);
			expect(mockLoggerService.log).toHaveBeenCalledWith(
				"Associated appointment updated successfully",
				undefined,
				undefined,
				{ appointmentId: mockExistingAppointment.id, visitorId: visitorId },
			);
			expect(mockLoggerService.log).toHaveBeenCalledWith(
				"Successfully updated visitor and appointment details.",
				undefined,
				undefined,
				{ visitorId: visitorId },
			);
		});

		it("should throw NotFoundException if visitor not found initially", async () => {
			mockVisitorRepository.findById.mockReset().mockResolvedValue(null); // Only for the first call
			await expect(useCase.execute(visitorId, updateDto)).rejects.toThrow(
				NotFoundException,
			);
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				expect.stringContaining("Visitor not found for update"),
				undefined,
				undefined,
				{ visitorId },
			);
		});

		it("should throw BadRequestException if visitor has no appointments", async () => {
			const visitorWithoutAppointments = {
				...getClonedMockExistingVisitor(),
				appointments: [],
			} as Visitor;
			mockVisitorRepository.findById
				.mockReset()
				.mockResolvedValue(visitorWithoutAppointments);

			await expect(useCase.execute(visitorId, updateDto)).rejects.toThrow(
				BadRequestException,
			);
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				"Visitor has no associated appointments to update",
				undefined,
				undefined,
				{ visitorId },
			);
		});

		it("should throw NotFoundException if associated appointment not found", async () => {
			mockVisitorRepository.findById.mockResolvedValue(
				getClonedMockExistingVisitor(),
			);
			mockAppointmentRepository.findById.mockResolvedValue(null);

			await expect(useCase.execute(visitorId, updateDto)).rejects.toThrow(
				NotFoundException,
			);
			expect(mockLoggerService.error).toHaveBeenCalledWith(
				"Associated appointment not found during update despite being listed under visitor.",
				undefined,
				undefined,
				{ visitorId, appointmentId: mockExistingAppointment.id },
			);
		});

		it("should throw BadRequestException if new supplier_id is provided but supplier not found", async () => {
			mockVisitorRepository.findById.mockResolvedValue(
				getClonedMockExistingVisitor(),
			);
			mockAppointmentRepository.findById.mockResolvedValue(
				getClonedMockFetchedAppointmentFull(),
			);
			mockSupplierRepository.findById.mockResolvedValue(null); // Supplier not found

			await expect(useCase.execute(visitorId, updateDto)).rejects.toThrow(
				BadRequestException,
			);
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				"Supplier not found during visitor update",
				undefined,
				undefined,
				{ supplierId: updateDto.supplier_id, visitorId },
			);
		});

		it("should throw BadRequestException if dates are invalid (check_out earlier than check_in)", async () => {
			const invalidDateDto: UpdateVisitorDto = {
				...updateDto,
				check_in_time: new Date("2024-01-02T12:00:00Z"),
				check_out_time: new Date("2024-01-02T10:00:00Z"), // Checkout before checkin
			};
			mockVisitorRepository.findById.mockResolvedValueOnce(
				getClonedMockExistingVisitor(),
			);
			mockAppointmentRepository.findById.mockResolvedValueOnce(
				getClonedMockFetchedAppointmentFull(),
			);
			// No need to mock supplier for this test if supplier_id is not the focus of date validation

			await expect(useCase.execute(visitorId, invalidDateDto)).rejects.toThrow(
				BadRequestException,
			);
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				"Validation failed: Check-out time must be after check-in time during update.",
				undefined,
				undefined,
				expect.objectContaining({
					check_in_time: expect.any(Date),
					check_out_time: expect.any(Date),
				}),
			);
		});

		it("should update only provided fields (partial update with name only)", async () => {
			const partialUpdateDto: UpdateVisitorDto = {
				name: "Only Name Updated",
			} as UpdateVisitorDto;
			const initialVisitor = getClonedMockExistingVisitor();
			initialVisitor.appointments = [getClonedMockFetchedAppointmentFull()];

			const expectedSavedVisitor = {
				...initialVisitor,
				name: "Only Name Updated",
			};
			// Appointment should largely remain the same if not in DTO
			const expectedSavedAppointment = initialVisitor.appointments[0];

			const finalResultVisitor = {
				...expectedSavedVisitor,
				appointments: [expectedSavedAppointment],
			};

			mockVisitorRepository.findById
				.mockReset()
				.mockResolvedValueOnce(initialVisitor)
				.mockResolvedValueOnce(finalResultVisitor as Visitor);
			mockAppointmentRepository.findById.mockResolvedValueOnce(
				getClonedMockFetchedAppointmentFull(),
			);
			// Supplier repo findById should not be called if supplier_id is not in partialUpdateDto

			await useCase.execute(visitorId, partialUpdateDto);

			expect(visitorRepo.save).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "Only Name Updated",
					email: initialVisitor.email, // Email should be old
				}),
			);
			expect(appointmentRepo.save).toHaveBeenCalledWith(
				expect.objectContaining({
					title: initialVisitor.appointments[0].title, // Title should be old
				}),
			);
			expect(supplierRepo.findById).not.toHaveBeenCalled(); // Since supplier_id is not in partialUpdateDto
		});

		it("should throw NotFoundException if final re-fetch of visitor fails", async () => {
			const initialVisitor = getClonedMockExistingVisitor();
			initialVisitor.appointments = [getClonedMockFetchedAppointmentFull()];

			mockVisitorRepository.findById
				.mockReset()
				.mockResolvedValueOnce(initialVisitor) // Initial load
				.mockResolvedValueOnce(null); // Final re-fetch fails
			mockAppointmentRepository.findById.mockResolvedValueOnce(
				getClonedMockFetchedAppointmentFull(),
			);
			mockSupplierRepository.findById.mockResolvedValueOnce(mockNewSupplier); // Assume supplier update part passes if DTO had it

			await expect(useCase.execute(visitorId, updateDto)).rejects.toThrow(
				NotFoundException,
			);
			expect(mockLoggerService.error).toHaveBeenCalledWith(
				"Failed to re-fetch visitor after update, though update operations were successful.",
				undefined,
				undefined,
				{ visitorId },
			);
		});
	});
});
