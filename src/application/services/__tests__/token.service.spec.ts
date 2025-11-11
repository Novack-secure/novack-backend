import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { TokenService } from "../token.service";
import { Employee } from "../../../domain/entities";
import { UnauthorizedException } from "@nestjs/common";

import { Supplier } from "../../../domain/entities/supplier.entity"; // Import Supplier
import { EmployeeCredentials } from "../../../domain/entities/employee-credentials.entity"; // Import EmployeeCredentials
import { Card } from "../../../domain/entities/card.entity"; // Import Card
import { ChatRoom } from "../../../domain/entities/chat-room.entity"; // Import ChatRoom

describe("TokenService", () => {
	let service: TokenService;
	let mockJwtService: Partial<JwtService>;
	let mockConfigService: Partial<ConfigService>;
	let mockEmployeeRepository: Partial<Repository<Employee>>;

	beforeEach(async () => {
		mockJwtService = {
			sign: jest.fn().mockReturnValue("test.jwt.token"),
			verifyAsync: jest.fn().mockResolvedValue({ sub: "test-id" }),
		};

		mockConfigService = {
			get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
				switch (key) {
					case "JWT_SECRET":
						return "test-secret";
					case "JWT_EXPIRES_IN":
						return "1d";
					case "JWT_REFRESH_SECRET":
						return "test-refresh-secret";
					case "JWT_REFRESH_EXPIRES_IN":
						return "7d";
					default:
						return defaultValue;
				}
			}),
		};

		mockEmployeeRepository = {
			update: jest.fn().mockResolvedValue({ affected: 1 }),
			findOne: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TokenService,
				{
					provide: JwtService,
					useValue: mockJwtService,
				},
				{
					provide: ConfigService,
					useValue: mockConfigService,
				},
				{
					provide: getRepositoryToken(Employee),
					useValue: mockEmployeeRepository,
				},
			],
		}).compile();

		service = module.get<TokenService>(TokenService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("generateTokens", () => {
		it("should generate access token successfully", async () => {
			const mockEmployee = {
				id: "test-employee-id",
				first_name: "John",
				last_name: "Doe",
				email: "john.doe@example.com",
				is_creator: false,
				supplier_id: "test-supplier-id",
				supplier: {
					id: "test-supplier-id",
					supplier_name: "Test Supplier",
				},
			} as Employee;

			const result = await service.generateTokens(mockEmployee);

			expect(result).toHaveProperty("access_token");
			expect(result).toHaveProperty("expires_in");
			expect(result.access_token).toBe("test.jwt.token");
			expect(result.expires_in).toBe(900); // 15 minutos
			expect(mockJwtService.sign).toHaveBeenCalledWith(
				expect.objectContaining({
					sub: "test-employee-id",
					email: "john.doe@example.com",
					name: "John Doe",
					supplier_id: "test-supplier-id",
					is_creator: false,
				}),
				{ expiresIn: "15m" }
			);
		});

		it("should handle employee without supplier", async () => {
			const mockEmployee = {
				id: "test-employee-id",
				first_name: "John",
				last_name: "Doe",
				email: "john.doe@example.com",
				is_creator: false,
				supplier_id: "test-supplier-id",
				supplier: null,
			} as Employee;

			const result = await service.generateTokens(mockEmployee);

			expect(result).toHaveProperty("access_token");
			expect(result).toHaveProperty("expires_in");
			expect(mockJwtService.sign).toHaveBeenCalledWith(
				expect.objectContaining({
					sub: "test-employee-id",
					supplier_id: "test-supplier-id", // Debe usar supplier_id cuando supplier es null
				}),
				{ expiresIn: "15m" }
			);
		});
	});

	describe("validateToken", () => {
		it("should validate token successfully", async () => {
			const mockPayload = { sub: "test-id", email: "test@example.com" };
			(mockJwtService.verify as jest.Mock) = jest.fn().mockReturnValue(mockPayload);

			const result = await service.validateToken("valid.token");

			expect(result).toEqual(mockPayload);
			expect(mockJwtService.verify).toHaveBeenCalledWith("valid.token");
		});

		it("should throw UnauthorizedException for invalid token", async () => {
			(mockJwtService.verify as jest.Mock) = jest.fn().mockImplementation(() => {
				throw new Error("Invalid token");
			});

			await expect(service.validateToken("invalid.token")).rejects.toThrow(
				UnauthorizedException
			);
		});
	});

	describe("getEmployeeFromPayload", () => {
		it("should return employee when found", async () => {
			const mockEmployee = {
				id: "test-id",
				first_name: "John",
				last_name: "Doe",
				email: "john.doe@example.com",
			} as Employee;

			(mockEmployeeRepository.findOne as jest.Mock).mockResolvedValueOnce(mockEmployee);

			const payload = { sub: "test-id" };
			const result = await service.getEmployeeFromPayload(payload);

			expect(result).toEqual(mockEmployee);
			expect(mockEmployeeRepository.findOne).toHaveBeenCalledWith({
				where: { id: "test-id" },
				relations: ["supplier", "credentials"],
			});
		});

		it("should throw UnauthorizedException when employee not found", async () => {
			(mockEmployeeRepository.findOne as jest.Mock).mockResolvedValueOnce(null);

			const payload = { sub: "non-existent-id" };

			await expect(service.getEmployeeFromPayload(payload)).rejects.toThrow(
				UnauthorizedException
			);
		});
	});
});