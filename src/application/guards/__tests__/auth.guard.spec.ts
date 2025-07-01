import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TokenService } from "../../services/token.service";
import { AuthGuard } from "../auth.guard";
import { IS_PUBLIC_KEY } from "../../decorators/public.decorator";

describe("AuthGuard", () => {
	let guard: AuthGuard;
	let mockTokenService: Partial<TokenService>;
	let mockReflector: Partial<Reflector>;
	let mockExecutionContext: Partial<ExecutionContext>;
	let mockRequest: any;

	beforeEach(() => {
		mockTokenService = {
			validateToken: jest.fn(),
		};

		mockReflector = {
			getAllAndOverride: jest.fn(),
		};

		mockRequest = {
			headers: {},
		};

		mockExecutionContext = {
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue(mockRequest),
			}),
			getHandler: jest.fn(),
			getClass: jest.fn(),
		};

		guard = new AuthGuard(
			mockTokenService as TokenService,
			mockReflector as Reflector,
		);
	});

	it("should be defined", () => {
		expect(guard).toBeDefined();
	});

	it("should allow request when route is public", async () => {
		(mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

		const result = await guard.canActivate(
			mockExecutionContext as ExecutionContext,
		);

		expect(result).toBe(true);
		expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
			IS_PUBLIC_KEY,
			[mockExecutionContext.getHandler(), mockExecutionContext.getClass()],
		);
	});

	it("should throw an exception when no authorization header is present", async () => {
		(mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

		let error;

		try {
			await guard.canActivate(mockExecutionContext as ExecutionContext);
		} catch (e) {
			error = e;
		}

		expect(error).toBeInstanceOf(UnauthorizedException);
		expect(error.message).toBe("Token inválido o expirado");
	});

	it("should throw an exception when authorization header does not start with Bearer", async () => {
		(mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
		mockRequest.headers.authorization = "Invalid token";

		let error;

		try {
			await guard.canActivate(mockExecutionContext as ExecutionContext);
		} catch (e) {
			error = e;
		}

		expect(error).toBeInstanceOf(UnauthorizedException);
		expect(error.message).toBe("Token inválido o expirado");
	});

	it("should throw an exception when token is invalid", async () => {
		(mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
		mockRequest.headers.authorization = "Bearer invalid.token";
		(mockTokenService.validateToken as jest.Mock).mockRejectedValue(
			new UnauthorizedException(),
		);

		let error;

		try {
			await guard.canActivate(mockExecutionContext as ExecutionContext);
		} catch (e) {
			error = e;
		}

		expect(error).toBeInstanceOf(UnauthorizedException);
		expect(error.message).toBe("Token inválido o expirado");
	});

	it("should return true and set user in request when token is valid", async () => {
		(mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
		const mockPayload = { sub: "user-id", email: "test@example.com" };
		mockRequest.headers.authorization = "Bearer valid.token";
		(mockTokenService.validateToken as jest.Mock).mockResolvedValue(
			mockPayload,
		);

		const result = await guard.canActivate(
			mockExecutionContext as ExecutionContext,
		);

		expect(result).toBe(true);
		expect(mockRequest.user).toEqual(mockPayload);
	});
});
