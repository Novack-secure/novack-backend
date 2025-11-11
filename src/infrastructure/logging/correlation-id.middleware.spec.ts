import { Test, TestingModule } from "@nestjs/testing";
import { CorrelationIdMiddleware } from "./correlation-id.middleware";
import {
	StructuredLoggerService,
	LogContext,
} from "./structured-logger.service";
import { Request, Response, NextFunction } from "express";
import { AsyncLocalStorage } from "async_hooks";

// Mock StructuredLoggerService and its static methods/properties
const mockAlsRun = jest.fn((context, callback) => callback());
const mockAlsGetStore = jest.fn();

// Mock the static getContextStorage to return our mock ALS
const mockGetContextStorage = jest.fn(() => ({
	run: mockAlsRun,
	getStore: mockAlsGetStore,
	enterWith: jest.fn(), // if used directly
	disable: jest.fn(), // if used directly
}));

// Keep the original createCorrelationId for testing its usage, or mock it if testing specific ID flow
// const originalCreateCorrelationId = StructuredLoggerService.createCorrelationId;

describe("CorrelationIdMiddleware", () => {
	let middleware: CorrelationIdMiddleware;
	// mockRequest will be defined per test using mockRequestBase
	let mockResponse: Partial<Response>;
	let nextFunction: NextFunction = jest.fn();
	let originalStaticGetContextStorage;

	// Define a comprehensive base mock for Request
	const mockRequestBase = {
		ip: "127.0.0.1", // Default IP
		method: "GET", // Default method
		path: "/", // Default path
		url: "/",
		cookies: {},
		signedCookies: {},
		params: {},
		query: {},
		body: {},
		route: { path: "/" },
		user: undefined, // Default no user
		app: {} as any,
		res: {} as any,
		next: jest.fn(),
		aborted: false,
		httpVersion: "1.1",
		httpVersionMajor: 1,
		httpVersionMinor: 1,
		complete: true,
		connection: {} as any,
		socket: {} as any,
		trailers: {},
		rawTrailers: [],
		setTimeout: jest.fn() as any,
		statusCode: 200,
		statusMessage: "OK",
		destroy: jest.fn(),
		logIn: jest.fn(),
		logOut: jest.fn(),
		isAuthenticated: jest.fn(),
		isUnauthenticated: jest.fn(),
		session: {} as any,
		flash: jest.fn(),
		// Correctly typed get/header methods
		get: jest
			.fn()
			.mockImplementation((name: string): string | string[] | undefined => {
				const lowerName = name.toLowerCase();
				if (lowerName === "set-cookie") {
					return (mockRequestBase.headers as any)[lowerName] as
						| string[]
						| undefined;
				}
				return (mockRequestBase.headers as any)[lowerName] as
					| string
					| undefined;
			}),
		header: jest
			.fn()
			.mockImplementation((name: string): string | string[] | undefined => {
				const lowerName = name.toLowerCase();
				if (lowerName === "set-cookie") {
					return (mockRequestBase.headers as any)[lowerName] as
						| string[]
						| undefined;
				}
				return (mockRequestBase.headers as any)[lowerName] as
					| string
					| undefined;
			}),
		accepts: jest.fn(),
		is: jest.fn(),
		headers: {}, // Default empty headers, to be overridden in tests
	} as unknown as Request; // Use unknown for better type safety then as Request

	beforeAll(() => {
		// Override the static method before any instantiation of services that might use it
		originalStaticGetContextStorage = StructuredLoggerService.getContextStorage;
		Object.defineProperty(StructuredLoggerService, "getContextStorage", {
			value: mockGetContextStorage,
			writable: true, // Allow it to be restored
		});
	});

	afterAll(() => {
		// Restore original static method
		Object.defineProperty(StructuredLoggerService, "getContextStorage", {
			value: originalStaticGetContextStorage,
		});
	});

	beforeEach(() => {
		// Corrected syntax
		// Reset mocks
		mockAlsRun.mockClear();
		mockAlsGetStore.mockClear();
		(nextFunction as jest.Mock).mockClear();
		mockGetContextStorage.mockClear(); // Clear calls to the getter itself

		// Setup default mock response for each test
		mockResponse = {
			setHeader: jest.fn(),
		};

		// Middleware instance can be created directly as it has no constructor dependencies
		middleware = new CorrelationIdMiddleware();
	});

	it("should be defined", () => {
		expect(middleware).toBeDefined();
	});

	it("should generate a new correlationId if not in headers", () => {
		const mockRequest = {
			...mockRequestBase,
			headers: {},
		} as unknown as Request;
		const createIdSpy = jest.spyOn(
			StructuredLoggerService,
			"createCorrelationId",
		);
		middleware.use(mockRequest, mockResponse as Response, nextFunction);
		expect(createIdSpy).toHaveBeenCalled();
		expect(mockResponse.setHeader).toHaveBeenCalledWith(
			"x-correlation-id",
			expect.any(String),
		);
		createIdSpy.mockRestore();
	});

	it("should use existing correlationId from request headers", () => {
		const existingCorrId = "existing-uuid-123";
		const mockRequest = {
			...mockRequestBase,
			headers: { "x-correlation-id": existingCorrId },
		} as unknown as Request;
		const createIdSpy = jest.spyOn(
			StructuredLoggerService,
			"createCorrelationId",
		);

		middleware.use(mockRequest, mockResponse as Response, nextFunction);

		expect(createIdSpy).not.toHaveBeenCalled();
		expect(mockResponse.setHeader).toHaveBeenCalledWith(
			"x-correlation-id",
			existingCorrId,
		);
		createIdSpy.mockRestore();
	});

	it("should set correlationId in response headers", () => {
		const mockRequest = {
			...mockRequestBase,
			headers: {},
		} as unknown as Request;
		middleware.use(mockRequest, mockResponse as Response, nextFunction);
		expect(mockResponse.setHeader).toHaveBeenCalledWith(
			"x-correlation-id",
			expect.any(String),
		);
	});

	it("should run next() in AsyncLocalStorage context", () => {
		const mockRequest = {
			...mockRequestBase,
			headers: {},
		} as unknown as Request;
		middleware.use(mockRequest, mockResponse as Response, nextFunction);
		expect(mockGetContextStorage).toHaveBeenCalled(); // Check if getContextStorage was called
		expect(mockAlsRun).toHaveBeenCalled();
		expect(nextFunction).toHaveBeenCalled();
	});

	it("should populate LogContext correctly (without user)", () => {
		const mockRequest = {
			...mockRequestBase,
			headers: { "user-agent": "TestAgent", "x-correlation-id": "test-id" }, // Ensure x-correlation-id can be read by req.get
			method: "GET",
			path: "/test/path",
			ip: "127.0.0.1",
			user: undefined,
		} as unknown as Request;
		// Re-assign get/header to use this specific mockRequest's headers
		mockRequest.get = jest
			.fn()
			.mockImplementation((name: string): string | string[] | undefined => {
				const lowerName = name.toLowerCase();
				if (lowerName === "set-cookie")
					return (mockRequest.headers as any)[lowerName] as
						| string[]
						| undefined;
				return (mockRequest.headers as any)[lowerName] as string | undefined;
			});
		mockRequest.header = mockRequest.get;

		middleware.use(mockRequest, mockResponse as Response, nextFunction);

		expect(mockAlsRun).toHaveBeenCalledWith(
			expect.objectContaining({
				correlationId: "test-id", // Will use header if present
				requestPath: "/test/path",
				method: "GET",
				userAgent: "TestAgent",
				ip: "127.0.0.1",
			}),
			expect.any(Function),
		);
	});

	it("should populate LogContext with userId if req.user.id is present", () => {
		const userId = "user-id-from-req";
		const mockRequest = {
			...mockRequestBase,
			headers: {},
			user: { id: userId } as any,
		} as unknown as Request;
		mockRequest.get = jest
			.fn()
			.mockImplementation((name: string): string | string[] | undefined => {
				const lowerName = name.toLowerCase();
				if (lowerName === "set-cookie")
					return (mockRequest.headers as any)[lowerName] as
						| string[]
						| undefined;
				return (mockRequest.headers as any)[lowerName] as string | undefined;
			});
		mockRequest.header = mockRequest.get;

		middleware.use(mockRequest, mockResponse as Response, nextFunction);

		expect(mockAlsRun).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: userId,
			}),
			expect.any(Function),
		);
	});

	it("should populate LogContext with userId if req.user.userId is present", () => {
		const userId = "user-id-from-req-userId";
		const mockRequest = {
			...mockRequestBase,
			headers: {},
			user: { userId: userId } as any,
		} as unknown as Request;
		mockRequest.get = jest
			.fn()
			.mockImplementation((name: string): string | string[] | undefined => {
				const lowerName = name.toLowerCase();
				if (lowerName === "set-cookie")
					return (mockRequest.headers as any)[lowerName] as
						| string[]
						| undefined;
				return (mockRequest.headers as any)[lowerName] as string | undefined;
			});
		mockRequest.header = mockRequest.get;

		middleware.use(mockRequest, mockResponse as Response, nextFunction);

		expect(mockAlsRun).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: userId,
			}),
			expect.any(Function),
		);
	});

	// TODO: Add more tests, e.g., for different types of correlation-id in header (array, etc. if applicable)
});
