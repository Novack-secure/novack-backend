import { Test, TestingModule } from "@nestjs/testing";
import { EmployeeController } from "../employee.controller";
import { FileStorageService } from "../../../application/services/file-storage.service";
import { ConfigService } from "@nestjs/config";
import { BadRequestException, ParseUUIDPipe } from "@nestjs/common";
import {
	CreateEmployeeDto,
	UpdateEmployeeDto,
} from "../../../application/dtos/employee";
import {
	CreateEmployeeUseCase,
	GetAllEmployeesUseCase,
	GetEmployeeByIdUseCase,
	UpdateEmployeeUseCase,
	DeleteEmployeeUseCase,
	UpdateEmployeeProfileImageUseCase,
} from "../../../application/use-cases/employee";

describe("EmployeeController", () => {
	let controller: EmployeeController;
	let createEmployeeUseCase: CreateEmployeeUseCase;
	let getAllEmployeesUseCase: GetAllEmployeesUseCase;
	let getEmployeeByIdUseCase: GetEmployeeByIdUseCase;
	let updateEmployeeUseCase: UpdateEmployeeUseCase;
	let deleteEmployeeUseCase: DeleteEmployeeUseCase;
	let updateEmployeeProfileImageUseCase: UpdateEmployeeProfileImageUseCase;
	let fileStorageService: FileStorageService;
	let configService: ConfigService;

	// Mock data
	const mockEmployee = {
		id: "123e4567-e89b-12d3-a456-426614174000",
		first_name: "Juan",
		last_name: "Pérez",
		email: "juan@example.com",
		is_creator: true,
		phone: "123456789",
		position: "Developer",
		department: "IT",
		supplier: {
			id: "987fcdeb-51a2-43f7-9abc-def012345678",
			supplier_name: "Empresa ABC",
			contact_email: "contact@empresa.com",
			phone_number: "123456789",
			address: "Dirección de prueba",
			city: "Ciudad",
			state: "Estado",
			postal_code: "12345",
			country: "País",
			tax_id: "ID123",
			description: "Descripción de prueba",
			website: "https://example.com",
			active: true,
			created_at: new Date(),
			updated_at: new Date(),
		},
		is_2fa_enabled: false,
		is_email_verified: false,
		login_attempts: 0,
		created_at: new Date(),
		updated_at: new Date(),
		profile_image_url: null,
		two_factor_secret: null,
		two_factor_recovery_codes: null,
		email_verification_token: null,
		email_verification_expires: null,
		locked_until: null,
	};

	const mockCreateEmployeeDto: CreateEmployeeDto = {
		first_name: "Juan",
		last_name: "Nuevo",
		email: "juan.nuevo@example.com",
		password: "password123",
		is_creator: false,
		phone: "987654321",
		position: "Designer",
		department: "UX",
		supplier_id: "987fcdeb-51a2-43f7-9abc-def012345678",
	};

	const mockUpdateEmployeeDto: UpdateEmployeeDto = {
		first_name: "Juan",
		last_name: "Actualizado",
		email: "juan.actualizado@example.com",
		phone: "111222333",
		position: "Senior Designer",
		department: "Design",
	};

	const mockFile = {
		buffer: Buffer.from("test image content"),
		originalname: "profile.jpg",
		mimetype: "image/jpeg",
		fieldname: "profileImage",
		encoding: "7bit",
		size: 12345,
	} as Express.Multer.File;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [EmployeeController],
			providers: [
				{
					provide: CreateEmployeeUseCase,
					useValue: {
						execute: jest.fn(),
					},
				},
				{
					provide: GetAllEmployeesUseCase,
					useValue: {
						execute: jest.fn(),
					},
				},
				{
					provide: GetEmployeeByIdUseCase,
					useValue: {
						execute: jest.fn(),
					},
				},
				{
					provide: UpdateEmployeeUseCase,
					useValue: {
						execute: jest.fn(),
					},
				},
				{
					provide: DeleteEmployeeUseCase,
					useValue: {
						execute: jest.fn(),
					},
				},
				{
					provide: UpdateEmployeeProfileImageUseCase,
					useValue: {
						execute: jest.fn(),
					},
				},
				{
					provide: FileStorageService,
					useValue: {
						uploadFile: jest.fn(),
					},
				},
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<EmployeeController>(EmployeeController);
		createEmployeeUseCase = module.get<CreateEmployeeUseCase>(
			CreateEmployeeUseCase,
		);
		getAllEmployeesUseCase = module.get<GetAllEmployeesUseCase>(
			GetAllEmployeesUseCase,
		);
		getEmployeeByIdUseCase = module.get<GetEmployeeByIdUseCase>(
			GetEmployeeByIdUseCase,
		);
		updateEmployeeUseCase = module.get<UpdateEmployeeUseCase>(
			UpdateEmployeeUseCase,
		);
		deleteEmployeeUseCase = module.get<DeleteEmployeeUseCase>(
			DeleteEmployeeUseCase,
		);
		updateEmployeeProfileImageUseCase =
			module.get<UpdateEmployeeProfileImageUseCase>(
				UpdateEmployeeProfileImageUseCase,
			);
		fileStorageService = module.get<FileStorageService>(FileStorageService);
		configService = module.get<ConfigService>(ConfigService);
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	describe("create", () => {
		it("should create a new employee", async () => {
			jest
				.spyOn(createEmployeeUseCase, "execute")
				.mockResolvedValue(mockEmployee as any);

			const result = await controller.create(mockCreateEmployeeDto);

			expect(result).toEqual(mockEmployee);
			expect(createEmployeeUseCase.execute).toHaveBeenCalledWith(
				mockCreateEmployeeDto,
			);
		});
	});

	describe("findAll", () => {
		it("should return an array of employees", async () => {
			const mockEmployees = [mockEmployee];
			jest
				.spyOn(getAllEmployeesUseCase, "execute")
				.mockResolvedValue(mockEmployees as any);

			const result = await controller.findAll();

			expect(result).toEqual(mockEmployees);
			expect(getAllEmployeesUseCase.execute).toHaveBeenCalled();
		});
	});

	describe("findOne", () => {
		it("should return a single employee by id", async () => {
			jest
				.spyOn(getEmployeeByIdUseCase, "execute")
				.mockResolvedValue(mockEmployee as any);

			const result = await controller.findOne(
				"123e4567-e89b-12d3-a456-426614174000",
			);

			expect(result).toEqual(mockEmployee);
			expect(getEmployeeByIdUseCase.execute).toHaveBeenCalledWith(
				"123e4567-e89b-12d3-a456-426614174000",
			);
		});
	});

	describe("update", () => {
		it("should update an employee", async () => {
			const updatedEmployee = {
				...mockEmployee,
				first_name: mockUpdateEmployeeDto.first_name,
				last_name: mockUpdateEmployeeDto.last_name,
				email: mockUpdateEmployeeDto.email,
				phone: mockUpdateEmployeeDto.phone,
				position: mockUpdateEmployeeDto.position,
				department: mockUpdateEmployeeDto.department,
			};

			jest
				.spyOn(updateEmployeeUseCase, "execute")
				.mockResolvedValue(updatedEmployee as any);

			const result = await controller.update(
				"123e4567-e89b-12d3-a456-426614174000",
				mockUpdateEmployeeDto,
			);

			expect(result).toEqual(updatedEmployee);
			expect(updateEmployeeUseCase.execute).toHaveBeenCalledWith(
				"123e4567-e89b-12d3-a456-426614174000",
				mockUpdateEmployeeDto,
			);
		});
	});

	describe("remove", () => {
		it("should remove an employee", async () => {
			jest
				.spyOn(deleteEmployeeUseCase, "execute")
				.mockResolvedValue(mockEmployee as any);

			const result = await controller.remove(
				"123e4567-e89b-12d3-a456-426614174000",
			);

			expect(result).toEqual(mockEmployee);
			expect(deleteEmployeeUseCase.execute).toHaveBeenCalledWith(
				"123e4567-e89b-12d3-a456-426614174000",
			);
		});
	});

	describe("uploadProfileImage", () => {
		it("should upload a profile image and update the employee profile image url", async () => {
			const bucketName = "test-employee-bucket";
			const imageUrl = "https://example.com/path/to/image.jpg";
			const updatedEmployee = {
				...mockEmployee,
				profile_image_url: imageUrl,
			};

			// El controlador devuelve un objeto con message y url en lugar del empleado completo
			const expectedResponse = {
				message: "Imagen de perfil actualizada correctamente.",
				url: imageUrl,
			};

			jest.spyOn(configService, "get").mockReturnValue(bucketName);
			jest.spyOn(fileStorageService, "uploadFile").mockResolvedValue(imageUrl);
			jest
				.spyOn(updateEmployeeProfileImageUseCase, "execute")
				.mockResolvedValue(updatedEmployee as any);

			const result = await controller.uploadProfileImage(
				"123e4567-e89b-12d3-a456-426614174000",
				mockFile,
			);

			expect(result).toEqual(expectedResponse);
			expect(configService.get).toHaveBeenCalledWith(
				"AWS_S3_EMPLOYEE_BUCKET_NAME",
			);
			expect(fileStorageService.uploadFile).toHaveBeenCalledWith(
				bucketName,
				mockFile.buffer,
				mockFile.originalname,
				mockFile.mimetype,
				"profile/",
			);
			expect(updateEmployeeProfileImageUseCase.execute).toHaveBeenCalledWith(
				"123e4567-e89b-12d3-a456-426614174000",
				imageUrl,
			);
		});

		it("should throw BadRequestException if no file is provided", async () => {
			await expect(
				controller.uploadProfileImage(
					"123e4567-e89b-12d3-a456-426614174000",
					null,
				),
			).rejects.toThrow(BadRequestException);
		});

		it("should throw Error if bucket name is not configured", async () => {
			jest.spyOn(configService, "get").mockReturnValue(null);

			await expect(
				controller.uploadProfileImage(
					"123e4567-e89b-12d3-a456-426614174000",
					mockFile,
				),
			).rejects.toThrow(
				Error, // Cambiado de BadRequestException a Error
			);
		});
	});
});
