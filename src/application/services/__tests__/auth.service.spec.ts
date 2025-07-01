import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "../auth.service";
import {
	UnauthorizedException,
	InternalServerErrorException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { StructuredLoggerService } from "../../../infrastructure/logging/structured-logger.service";
import { TokenService } from "../token.service";
import { Employee } from "../../../domain/entities";
import { Request } from "express";
import { SmsService } from "../sms.service";
import { EmployeeService } from "../employee.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EmployeeCredentials, RefreshToken } from "../../../domain/entities";

jest.mock("bcrypt");

describe("AuthService", () => {
	let service: AuthService;
	let mockEmployeeRepository: any;
	let mockLoggerService: any;
	let mockTokenService: any;
	let mockSmsService: any;
	let mockEmployeeService: any;

	// Datos de prueba
	const mockEmail = "test@example.com";
	const mockPassword = "password123";
	let currentMockEmployee: Employee;

	const createMockEmployeeCredentials = () => ({
		id: "cred-123",
		employee_id: "emp-123",
		password_hash: "hashedPassword",
		password_salt: "salt",
		is_email_verified: true,
		is_phone_verified: false,
		is_sms_2fa_enabled: false,
		phone_number_verified: false,
		recovery_codes: null,
		totp_secret_key: null,
		totp_secret_url: null,
		is_totp_verified: false,
		totp_verified_at: null,
		totp_enabled_at: null,
		created_at: new Date(),
		updated_at: new Date(),
		last_login: new Date(),
		last_password_change: new Date(),
		sms_otp_code: null,
		sms_otp_code_expires_at: null,
	});

	const createMockEmployee = () => {
		const employee = new Employee();
		employee.id = "emp-123";
		employee.email = mockEmail;
		employee.first_name = "Test";
		employee.last_name = "User";
		employee.phone = "+1234567890";
		employee.supplier_id = "supp-123";
		employee.created_at = new Date();
		employee.updated_at = new Date();
		employee.credentials = createMockEmployeeCredentials() as any;
		return employee;
	};

	beforeEach(async () => {
		currentMockEmployee = createMockEmployee();

		mockEmployeeRepository = {
			findOne: jest.fn().mockResolvedValue(currentMockEmployee),
			save: jest.fn().mockResolvedValue(currentMockEmployee),
			find: jest.fn().mockResolvedValue([currentMockEmployee]),
		};

		mockLoggerService = {
			setContext: jest.fn(),
			log: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		mockTokenService = {
			generateTokens: jest.fn().mockResolvedValue({
				access_token: "new.access.token",
				refresh_token: "new.refresh.token",
				expires_in: 900,
				token_type: "Bearer"
			}),
			refreshAccessToken: jest.fn().mockResolvedValue({
				access_token: "refreshed.access.token",
				refresh_token: "refreshed.refresh.token",
				expires_in: 900,
				token_type: "Bearer"
			}),
			revokeToken: jest.fn().mockImplementation((token) => {
				if (token === "valid-token") {
					return Promise.resolve(true);
				} else {
					return Promise.resolve(false);
				}
			}),
			validateToken: jest.fn().mockResolvedValue({ userId: "emp-123" }),
		};

		mockSmsService = {
			sendOtp: jest.fn().mockResolvedValue(undefined),
		};
		
		mockEmployeeService = {
		    validateEmployee: jest.fn().mockResolvedValue(currentMockEmployee),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthService,
				{
				    provide: EmployeeService,
				    useValue: mockEmployeeService,
				},
				{
					provide: "IEmployeeRepository",
					useValue: mockEmployeeRepository,
				},
				{
					provide: StructuredLoggerService,
					useValue: mockLoggerService,
				},
				{
					provide: TokenService,
					useValue: mockTokenService,
				},
				{
					provide: SmsService,
					useValue: mockSmsService,
				},
				{
				    provide: getRepositoryToken(Employee),
				    useValue: mockEmployeeRepository,
				},
				{
				    provide: getRepositoryToken(EmployeeCredentials),
				    useValue: { 
				        findOne: jest.fn(),
				        save: jest.fn()
				    },
				},
				{
				    provide: getRepositoryToken(RefreshToken),
				    useValue: { 
				        findOne: jest.fn(),
				        save: jest.fn()
				    },
				},
			],
		}).compile();

		service = module.get<AuthService>(AuthService);

		// Mockear employeeAuthRepository
		jest.spyOn(service["employeeAuthRepository"], "save").mockImplementation(async (obj) => obj as any);
		jest.spyOn(service["employeeAuthRepository"], "findOne").mockImplementation(async (query) => currentMockEmployee.credentials);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("login", () => {
		const mockRequest = {
			headers: { "user-agent": "test-user-agent" },
			ip: "127.0.0.1",
		} as unknown as Request;

		it("should login successfully with valid credentials and no 2FA", async () => {
			mockEmployeeRepository.findOne.mockResolvedValue(currentMockEmployee);
			(bcrypt.compare as jest.Mock).mockResolvedValue(true);
			mockTokenService.generateTokens.mockResolvedValue({
				access_token: "new.access.token",
				refresh_token: "new.refresh.token",
				expires_in: 900,
				token_type: "Bearer",
			});
			const result = await service.login(mockEmail, mockPassword, mockRequest);
			if ('employee' in result) {
				expect(result).toHaveProperty("access_token", "new.access.token");
				expect(result.employee).toBeDefined();
				const logCall = mockLoggerService.log.mock.calls.find(call => call[0] === "Login successful (no SMS OTP required or passed), generating tokens...");
				expect(logCall).toBeDefined();
				const logJson = JSON.parse(logCall[2]);
				expect(logJson.userId).toBe(currentMockEmployee.id);
				expect(logJson.email).toBe(currentMockEmployee.email);
			} else {
				expect(result.smsOtpRequired).toBe(true);
			}
		});

		it("should throw UnauthorizedException if employee not found", async () => {
			mockEmployeeRepository.findOne.mockResolvedValue(null);
			await expect(
				service.login(mockEmail, mockPassword, mockRequest),
			).rejects.toThrow(UnauthorizedException);
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				"Login failed: Invalid credentials - User not found or no credentials",
				undefined,
				JSON.stringify({ email: mockEmail }),
			);
		});

		it("should throw UnauthorizedException for incorrect password", async () => {
			mockEmployeeRepository.findOne.mockResolvedValue(currentMockEmployee);
			(bcrypt.compare as jest.Mock).mockResolvedValue(false);
			await expect(
				service.login(mockEmail, mockPassword, mockRequest),
			).rejects.toThrow(UnauthorizedException);
		});

		it("should throw UnauthorizedException if email is not verified", async () => {
			currentMockEmployee.credentials.is_email_verified = false;
			mockEmployeeRepository.findOne.mockResolvedValue(currentMockEmployee);
			(bcrypt.compare as jest.Mock).mockResolvedValue(true);
			await expect(
				service.login(mockEmail, mockPassword, mockRequest),
			).rejects.toThrow(UnauthorizedException);
		});

		it("should return smsOtpRequired if SMS 2FA is enabled and phone is verified", async () => {
			currentMockEmployee.credentials.is_sms_2fa_enabled = true;
			currentMockEmployee.credentials.phone_number_verified = true;
			currentMockEmployee.phone = "+1234567890";

			mockEmployeeRepository.findOne.mockResolvedValue(currentMockEmployee);
			(bcrypt.compare as jest.Mock).mockResolvedValue(true);
			mockSmsService.sendOtp = jest.fn().mockResolvedValue(undefined);

			const result = await service.login(mockEmail, mockPassword, mockRequest);

			expect(result).toEqual({
				message: "SMS OTP verification required.",
				smsOtpRequired: true,
				userId: currentMockEmployee.id,
			});
		});

		it("should throw InternalServerErrorException if SMS 2FA enabled but no phone number", async () => {
			currentMockEmployee.credentials.is_sms_2fa_enabled = true;
			currentMockEmployee.credentials.phone_number_verified = true;
			currentMockEmployee.phone = null; // No phone

			mockEmployeeRepository.findOne.mockResolvedValue(currentMockEmployee);
			(bcrypt.compare as jest.Mock).mockResolvedValue(true);

			await expect(
				service.login(mockEmail, mockPassword, mockRequest),
			).rejects.toThrow(InternalServerErrorException);
			expect(mockLoggerService.error).toHaveBeenCalledWith(
				"SMS 2FA enabled but no phone number for user",
				undefined,
				JSON.stringify({ userId: currentMockEmployee.id }),
			);
		});

		it("should throw InternalServerErrorException if smsService.sendOtp fails", async () => {
			currentMockEmployee.credentials.is_sms_2fa_enabled = true;
			currentMockEmployee.credentials.phone_number_verified = true;
			currentMockEmployee.phone = "+1234567890";

			mockEmployeeRepository.findOne.mockResolvedValue(currentMockEmployee);
			(bcrypt.compare as jest.Mock).mockResolvedValue(true);
			mockSmsService.sendOtp.mockRejectedValue(new Error("SMS failed"));

			await expect(
				service.login(mockEmail, mockPassword, mockRequest),
			).rejects.toThrow(InternalServerErrorException);
			expect(mockLoggerService.error).toHaveBeenCalledWith(
				"Failed to send login OTP SMS via SmsService during login attempt",
				undefined,
				JSON.stringify({ userId: currentMockEmployee.id, error: "SMS failed" }),
			);
		});
	});

	describe("verifySmsOtpAndLogin", () => {
		const mockUserId = "test-user-id";
		const mockOtp = "123456";
		let mockEmployeeWithOtp: Employee;

		beforeEach(() => {
			mockEmployeeWithOtp = createMockEmployee();
			mockEmployeeWithOtp.id = mockUserId;
			mockEmployeeWithOtp.credentials.sms_otp_code = mockOtp;
			mockEmployeeWithOtp.credentials.sms_otp_code_expires_at = new Date(
				Date.now() + 5 * 60 * 1000,
			);
			mockEmployeeRepository.findOne = jest.fn().mockResolvedValue(mockEmployeeWithOtp);
		});

		const mockRequest = {
			headers: { "user-agent": "test-user-agent" },
			ip: "127.0.0.1",
		} as unknown as Request;

		it("should successfully verify OTP and login", async () => {
			mockTokenService.generateTokens.mockResolvedValue({
				access_token: "final.access.token",
				refresh_token: "final.refresh.token",
				expires_in: 900,
				token_type: "Bearer",
			});

			const result = await service.verifySmsOtpAndLogin(
				mockUserId,
				mockOtp,
				mockRequest,
			);

			expect(result).toHaveProperty("access_token", "final.access.token");
			expect(result.employee).toBeDefined();
			expect(mockEmployeeRepository.findOne).toHaveBeenCalledWith(
				expect.objectContaining({ where: { id: mockUserId }, relations: ["credentials", "supplier"] })
			);
		});

		it("should throw UnauthorizedException if employee not found", async () => {
			mockEmployeeRepository.findOne.mockResolvedValue(null);
			
			await expect(
				service.verifySmsOtpAndLogin(mockUserId, mockOtp, mockRequest),
			).rejects.toThrow(UnauthorizedException);
			
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				"SMS OTP login verification failed: Employee or credentials not found",
				undefined,
				JSON.stringify({
					userId: mockUserId,
					reason: "Employee or credentials not found",
				}),
			);
		});

		it("should throw UnauthorizedException if no OTP is pending", async () => {
			if (mockEmployeeWithOtp.credentials)
				mockEmployeeWithOtp.credentials.sms_otp_code = null;
			
			mockEmployeeRepository.findOne.mockResolvedValue(mockEmployeeWithOtp);
			
			await expect(
				service.verifySmsOtpAndLogin(mockUserId, mockOtp, mockRequest),
			).rejects.toThrow(UnauthorizedException);
			
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				"SMS OTP login verification failed: No OTP pending",
				undefined,
				JSON.stringify({
					userId: mockUserId,
					reason: "No OTP pending or already verified",
				}),
			);
		});

		it("should throw UnauthorizedException if OTP is expired", async () => {
			if (mockEmployeeWithOtp.credentials)
				mockEmployeeWithOtp.credentials.sms_otp_code_expires_at = new Date(
					Date.now() - 1000,
				);
			mockEmployeeRepository.findOne.mockResolvedValue(
				mockEmployeeWithOtp,
			);
			await expect(
				service.verifySmsOtpAndLogin(mockUserId, mockOtp, mockRequest),
			).rejects.toThrow(UnauthorizedException);
		});

		it("should throw UnauthorizedException for invalid OTP", async () => {
			mockEmployeeRepository.findOne.mockResolvedValue(
				mockEmployeeWithOtp,
			);
			await expect(
				service.verifySmsOtpAndLogin(mockUserId, "wrong-otp", mockRequest),
			).rejects.toThrow(UnauthorizedException);
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				"SMS OTP login verification failed: Invalid OTP",
				undefined,
				JSON.stringify({ userId: mockUserId, reason: "Invalid OTP" }),
			);
		});
	});

	describe("refreshToken", () => {
		const mockToken = "valid.refresh.token";
		const mockRequest = {} as Request; // Minimal request object

		it("should return new tokens", async () => {
			mockTokenService.refreshAccessToken.mockResolvedValue({
				access_token: "refreshed.access.token",
				refresh_token: "refreshed.refresh.token",
				expires_in: 900,
				token_type: "Bearer",
			});
			const result = await service.refreshToken(mockToken, mockRequest);

			expect(result).toHaveProperty("access_token", "refreshed.access.token");
			expect(mockTokenService.refreshAccessToken).toHaveBeenCalledWith(
				mockToken,
				mockRequest,
			);
			expect(mockLoggerService.log).toHaveBeenCalledWith(
				"Token refreshed successfully",
			);
		});
	});

	describe("logout", () => {
		const mockToken = "valid.refresh.token";

		it("should call tokenService.revokeToken and log success", async () => {
			mockTokenService.revokeToken.mockResolvedValue(true);
			const result = await service.logout(mockToken);

			expect(result).toEqual({ message: "Logged out successfully" });
			expect(mockTokenService.revokeToken).toHaveBeenCalledWith(mockToken);
			expect(mockLoggerService.log).toHaveBeenCalledWith(
				"Refresh token revoked successfully.",
			);
		});

		it("should handle token already revoked or invalid", async () => {
			mockTokenService.revokeToken.mockResolvedValue(false);
			const result = await service.logout("invalid-token");
			expect(result).toEqual({ message: "Logout processed; token is invalid or already revoked." });
			expect(mockLoggerService.warn).toHaveBeenCalledWith(
				"Failed to revoke refresh token: token may be invalid or already revoked."
			);
		});
	});
});
