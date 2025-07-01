import { SessionSecurityMiddleware } from "../session-security.middleware";
import { Request, Response } from "express";

describe("SessionSecurityMiddleware", () => {
	let middleware: SessionSecurityMiddleware;
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	let mockNext: jest.Mock;

	beforeEach(() => {
		middleware = new SessionSecurityMiddleware();
		mockRequest = {};
		mockResponse = {
			setHeader: jest.fn(),
		};
		mockNext = jest.fn();
	});

	it("should be defined", () => {
		expect(middleware).toBeDefined();
	});

	it("should add security headers", () => {
		// Ejecutar
		middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

		// Verificar
		expect(mockResponse.setHeader).toHaveBeenCalledWith(
			"X-Frame-Options",
			"DENY",
		);
		expect(mockResponse.setHeader).toHaveBeenCalledWith(
			"X-XSS-Protection",
			"1; mode=block",
		);
		expect(mockResponse.setHeader).toHaveBeenCalledWith(
			"X-Content-Type-Options",
			"nosniff",
		);
		expect(mockResponse.setHeader).toHaveBeenCalledWith(
			"Strict-Transport-Security",
			"max-age=31536000; includeSubDomains; preload",
		);
		expect(mockResponse.setHeader).toHaveBeenCalledWith(
			"Referrer-Policy",
			"no-referrer-when-downgrade",
		);
		expect(mockResponse.setHeader).toHaveBeenCalledWith(
			"Permissions-Policy",
			"camera=(), microphone=(), geolocation=()",
		);
		expect(mockNext).toHaveBeenCalled();
	});

	it("should call next function", () => {
		// Ejecutar
		middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

		// Verificar
		expect(mockNext).toHaveBeenCalled();
		expect(mockNext.mock.calls.length).toBe(1);
	});
});
