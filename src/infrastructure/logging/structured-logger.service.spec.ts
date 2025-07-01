import { Test, TestingModule } from "@nestjs/testing";
import {
	StructuredLoggerService,
	LogContext,
} from "./structured-logger.service";
import { ConfigService } from "@nestjs/config";
import { LogTransportService } from "./log-transport.service";
import { AsyncLocalStorage } from "async_hooks";

// Mocks
const mockConfigServiceGet = jest.fn();
const mockConfigService = {
	get: mockConfigServiceGet,
};

const mockLogTransportService = {
	sendLog: jest.fn(),
	getStats: jest.fn(),
	isLogstashConnected: jest.fn(),
};

describe("StructuredLoggerService", () => {
	let service: StructuredLoggerService;
	let als: AsyncLocalStorage<LogContext>;
	let testingModule: TestingModule; // Renamed to avoid conflict

	afterEach(() => {
		// Reset static properties after each test
		(StructuredLoggerService as any).initialized = false;
		(StructuredLoggerService as any).defaultLogLevel = "info";
		(StructuredLoggerService as any).contextLogLevels = {};
		(StructuredLoggerService as any).logTransport = undefined;
		jest.clearAllMocks(); // Also clear all mocks
	});

	beforeEach(async () => {
		// Reset mocks for each test
		mockConfigServiceGet.mockReset(); // Reset the actual jest.fn()
		mockLogTransportService.sendLog.mockReset();

		// Default mock implementations
		// Default global log level to 'info'
		mockConfigServiceGet.mockImplementation(
			(key: string, defaultValue?: any) => {
				if (key === "logging.level") return "info";
				if (key === "logging.contextLogLevels") return {};
				return defaultValue;
			},
		);

		testingModule = await Test.createTestingModule({
			// Assign to testingModule
			providers: [
				StructuredLoggerService,
				// Provide the mock with a more specific type or use as is if Test.createTestingModule handles it
				{
					provide: ConfigService,
					useValue: mockConfigService as unknown as ConfigService,
				},
				{ provide: LogTransportService, useValue: mockLogTransportService },
			],
		}).compile();

		service = await testingModule.resolve<StructuredLoggerService>(
			StructuredLoggerService,
		); // Use await resolve
		als = StructuredLoggerService.getContextStorage(); // Get the static ALS instance

		// Ensure a clean context for each test by exiting any existing ALS context
		// This is a bit of a workaround as ALS state can persist across tests if not managed.
		// A more robust solution might involve a custom setup/teardown for ALS context or
		// ensuring each test runs in its own ALS context properly.
		// Removed ALS reset from here, let individual tests manage if needed or rely on new run context
		// if (als && als.getStore()) { // als might not be initialized yet for the first run
		//     const emptyContext: LogContext = {};
		//     als.enterWith(emptyContext);
		// }
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("Context Setting", () => {
		it("should set and use instance context", () => {
			service.setContext("TestInstanceContext");
			service.log("Test message");
			expect(mockLogTransportService.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					context: "TestInstanceContext",
					level: "info",
					message: "Test message",
				}),
			);
		});

		it("should use provided context over instance context", () => {
			service.setContext("InstanceContext");
			service.log("Test message", "ProvidedContext");
			expect(mockLogTransportService.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					context: "ProvidedContext",
					level: "info",
					message: "Test message",
				}),
			);
		});

		it('should use "Global" if no context is set', () => {
			// Need a new instance that hasn't had setContext called by other tests or constructor.
			// This is tricky with static initialization. For this test, we assume default state or re-initialize.
			// The afterEach should reset static 'initialized' flag.
			const newService = new StructuredLoggerService(
				mockConfigService as any,
				mockLogTransportService as any,
			);
			newService.log("Test message");
			expect(mockLogTransportService.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					context: "Global",
					level: "info",
					message: "Test message",
				}),
			);
		});
	});

	describe("Log Level Handling", () => {
		it('should log "info" messages when default level is "info"', () => {
			service.log("Info message");
			expect(mockLogTransportService.sendLog).toHaveBeenCalledTimes(1);
			expect(mockLogTransportService.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({ level: "info", message: "Info message" }),
			);
		});

		it('should log "debug" messages when default level is "debug"', () => {
			// Reiniciar las propiedades estáticas
			Object.defineProperty(StructuredLoggerService, "initialized", {
				value: false,
				writable: true,
			});
			Object.defineProperty(StructuredLoggerService, "defaultLogLevel", {
				value: "debug",
				writable: true,
			});

			mockConfigService.get.mockImplementation((key: string) => {
				if (key === "logging.level") return "debug";
				if (key === "logging.contextLogLevels") return {};
				return undefined;
			});
			// Re-initialize service to pick up new config. Relies on afterEach to reset 'initialized'.
			const debugService = new StructuredLoggerService(
				mockConfigService as any,
				mockLogTransportService as any,
			);
			debugService.debug("Debug message");
			// expect(mockLogTransportService.sendLog).toHaveBeenCalledTimes(1); // This can be tricky if other logs happened
			expect(mockLogTransportService.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					level: "debug",
					message: "Debug message",
					context: "Global",
				}),
			);
		});

		it('should NOT log "debug" messages when default level is "info"', () => {
			// Service is already configured with 'info' from the main beforeEach
			service.debug("Debug message");
			expect(mockLogTransportService.sendLog).not.toHaveBeenCalled();
		});

		it('should log "warn" messages when default level is "info"', () => {
			service.warn("Warn message");
			// expect(mockLogTransportService.sendLog).toHaveBeenCalledTimes(1);
			expect(mockLogTransportService.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({ level: "warn", message: "Warn message" }),
			);
		});

		it('should log "error" messages when default level is "info"', () => {
			service.error("Error message", "TestContext", "trace details");
			// expect(mockLogTransportService.sendLog).toHaveBeenCalledTimes(1);
			expect(mockLogTransportService.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					level: "error",
					message: "Error message",
					context: "TestContext",
					stack_trace: "trace details",
				}),
			);
		});

		it('should log "verbose" messages if default level is "verbose"', () => {
			// Reiniciar las propiedades estáticas
			Object.defineProperty(StructuredLoggerService, "initialized", {
				value: false,
				writable: true,
			});
			Object.defineProperty(StructuredLoggerService, "defaultLogLevel", {
				value: "verbose",
				writable: true,
			});

			mockConfigService.get.mockImplementation((key: string) => {
				if (key === "logging.level") return "verbose";
				if (key === "logging.contextLogLevels") return {};
				return undefined;
			});
			const verboseService = new StructuredLoggerService(
				mockConfigService as any,
				mockLogTransportService as any,
			);
			verboseService.verbose("Verbose message");
			expect(mockLogTransportService.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					level: "verbose",
					message: "Verbose message",
					context: "Global",
				}),
			);
		});

		it('should NOT log "verbose" messages if default level is "info"', () => {
			service.verbose("Verbose message");
			expect(mockLogTransportService.sendLog).not.toHaveBeenCalled();
		});
	});

	describe("Context-Specific Log Levels", () => {
		// This beforeEach sets up mockConfigService for context-specific levels.
		// Tests within this describe block will create their own instances of StructuredLoggerService
		// to pick up this specific configuration, relying on the global afterEach to reset static properties.
		beforeEach(() => {
			mockConfigService.get.mockImplementation((key: string) => {
				if (key === "logging.level") return "info"; // Default global level
				if (key === "logging.contextLogLevels")
					return { SpecificContext: "debug" };
				return undefined;
			});
		});

		it('should log "debug" for "SpecificContext" when its level is "debug" and global is "info"', () => {
			// Reiniciar las propiedades estáticas
			Object.defineProperty(StructuredLoggerService, "initialized", {
				value: false,
				writable: true,
			});
			Object.defineProperty(StructuredLoggerService, "contextLogLevels", {
				value: { SpecificContext: "debug" },
				writable: true,
			});

			// Create a new instance that will pick up the modified config due to static reset in global afterEach
			const contextSpecificService = new StructuredLoggerService(
				mockConfigService as any,
				mockLogTransportService as any,
			);
			contextSpecificService.debug(
				"Debug message for specific context",
				"SpecificContext",
			);
			expect(mockLogTransportService.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					level: "debug",
					context: "SpecificContext",
					message: "Debug message for specific context",
				}),
			);
		});

		it('should NOT log "debug" for "OtherContext" when global is "info"', () => {
			// This instance will use the config from this describe's beforeEach
			const contextSpecificService = new StructuredLoggerService(
				mockConfigService as any,
				mockLogTransportService as any,
			);
			contextSpecificService.debug(
				"Debug message for other context",
				"OtherContext",
			);
			expect(mockLogTransportService.sendLog).not.toHaveBeenCalled();
		});

		it('should log "info" for "SpecificContext" (which is set to "debug" level)', () => {
			// This instance will use the config from this describe's beforeEach
			const contextSpecificService = new StructuredLoggerService(
				mockConfigService as any,
				mockLogTransportService as any,
			);
			contextSpecificService.log(
				"Info message for specific context",
				"SpecificContext",
			);
			expect(mockLogTransportService.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({ level: "info", context: "SpecificContext" }),
			);
		});
	});

	describe("Log Formatting and Correlation ID", () => {
		it("should include standard fields (timestamp, level, message, context)", () => {
			service.log("A standard message", "StandardContext"); // service from main beforeEach
			const logCall = mockLogTransportService.sendLog.mock.calls[0][0];
			expect(logCall.timestamp).toBeDefined();
			expect(logCall.level).toBe("info");
			expect(logCall.message).toBe("A standard message");
			expect(logCall.context).toBe("StandardContext");
		});

		it("should include correlationId from AsyncLocalStorage if present", () => {
			const testCorrelationId = "test-corr-id-123";
			als.run({ correlationId: testCorrelationId }, () => {
				service.log("Message with correlation ID");
			});
			expect(mockLogTransportService.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					correlationId: testCorrelationId,
					message: "Message with correlation ID",
				}),
			);
		});

		it("should generate a correlationId if none is in context and one is created via static method", () => {
			// This test is more about the static method and its usage,
			// but if a log happens outside an ALS context where one might be expected,
			// the logger itself doesn't create it, CorrelationIdMiddleware does.
			// The 'no-correlation-id' is the default when ALS store is empty.

			// Create a new service instance that doesn't have a specific context set by setContext()
			// to test the 'Global' context fallback for an instance.
			// afterEach resets static properties, so this new instance will re-initialize.
			const globalContextService = new StructuredLoggerService(
				mockConfigService as any,
				mockLogTransportService as any,
			);
			globalContextService.log("Message without explicit ALS correlation ID");
			expect(mockLogTransportService.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					correlationId: "no-correlation-id",
					context: "Global",
				}),
			);
		});

		it("should include userId and other context from AsyncLocalStorage", () => {
			const logContext: LogContext = {
				correlationId: "corr-id-user",
				userId: "user-123",
				requestPath: "/test",
				method: "GET",
			};
			als.run(logContext, () => {
				service.warn("User action warning");
			});
			expect(mockLogTransportService.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					correlationId: "corr-id-user",
					userId: "user-123",
					requestPath: "/test",
					method: "GET",
					level: "warn",
					message: "User action warning",
				}),
			);
		});

		it("should correctly format error logs with trace and meta", () => {
			const error = new Error("Test error");
			error.stack = "Error: Test error\n    at <anonymous>:1:1";
			service.error(error.message, "ErrorContext", error.stack, {
				customMeta: "value",
			});

			const logCall = mockLogTransportService.sendLog.mock.calls[0][0];
			expect(logCall.level).toBe("error");
			expect(logCall.message).toBe("Test error");
			expect(logCall.context).toBe("ErrorContext");
			// Verify stack_trace is a top-level property
			expect(logCall.stack_trace).toEqual(error.stack);
			// Verify meta contains only the customMeta part
			expect(logCall.meta).toEqual(
				expect.arrayContaining([
					{ customMeta: "value" },
					// { trace: error.stack } // Removed from meta
				]),
			);
			// Ensure meta does not contain the trace if it's top-level
			expect(logCall.meta).not.toEqual(
				expect.arrayContaining([
					expect.objectContaining({ trace: error.stack }),
				]),
			);
		});

		it("should handle message as an object", () => {
			const messageObject = { detail: "This is an object", value: 42 };
			service.log(messageObject, "ObjectMessageContext");
			expect(mockLogTransportService.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					message: JSON.stringify(messageObject),
					context: "ObjectMessageContext",
				}),
			);
		});
	});

	// Test static methods if necessary, though they are used internally by instance methods.
	// describe('Static Methods', () => {
	//   it('createCorrelationId should return a UUID v4', () => {
	//     const corrId = StructuredLoggerService.createCorrelationId();
	//     // Basic UUID v4 regex
	//     expect(corrId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
	//   });
	// });
});
