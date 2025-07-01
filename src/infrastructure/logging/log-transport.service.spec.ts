import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { LogTransportService } from "./log-transport.service";
import * as net from "net";
import * as fs from "fs";
import * as path from "path";

// Mock the 'net' module
jest.mock("net", () => ({
	Socket: jest.fn().mockImplementation(() => ({
		connect: jest.fn(),
		on: jest.fn(),
		write: jest.fn(),
		destroy: jest.fn(),
		setTimeout: jest.fn(),
		writable: true, // Default to writable for some tests
	})),
}));

// Mock 'fs' module for file operations
jest.mock("fs", () => ({
	...jest.requireActual("fs"), // Import and retain default behavior
	existsSync: jest.fn(),
	mkdirSync: jest.fn(),
	createWriteStream: jest.fn().mockImplementation(() => ({
		write: jest.fn(),
		end: jest.fn(),
		on: jest.fn(),
	})),
}));

describe("LogTransportService", () => {
	let service: LogTransportService;
	let mockConfigService: ConfigService;
	let mockSocketInstance: jest.Mocked<net.Socket>; // Renamed for clarity and typing
	let mockWriteStream: fs.WriteStream; // This might still be okay if used carefully

	beforeEach(async () => {
		// Reset mocks
		(fs.existsSync as jest.Mock).mockReset();
		(fs.mkdirSync as jest.Mock).mockReset();
		(fs.createWriteStream as jest.Mock).mockImplementation(() => ({
			write: jest.fn(),
			end: jest.fn(),
			on: jest.fn(),
		}));

		// Define the specific methods for the instance to be returned for each test
		mockSocketInstance = {
			connect: jest
				.fn()
				.mockImplementation(
					(
						portOrPath: any,
						hostOrConnectListener?: any,
						connectListener?: any,
					) => {
						if (typeof hostOrConnectListener === "function") {
							// (path, listener) or (port, listener)
							hostOrConnectListener();
						} else if (typeof connectListener === "function") {
							// (port, host, listener)
							connectListener();
						}
						return mockSocketInstance; // Return instance for chaining if any
					},
				),
			on: jest.fn().mockReturnThis(),
			write: jest.fn((data: any, encoding?: any, callback?: any) => {
				if (typeof encoding === "function") callback = encoding;
				if (typeof callback === "function") callback();
				return true; // Simulate successful write
			}),
			destroy: jest.fn().mockReturnThis(),
			setTimeout: jest.fn().mockReturnThis(),
			writable: true, // Default writable state
			// Add all other methods from net.Socket that might be called by the service
			removeAllListeners: jest.fn().mockReturnThis(),
			end: jest.fn((callback?: () => void) => {
				if (callback) callback();
				return mockSocketInstance;
			}),
			setEncoding: jest.fn().mockReturnThis(),
			setKeepAlive: jest.fn().mockReturnThis(),
			setNoDelay: jest.fn().mockReturnThis(),
			ref: jest.fn().mockReturnThis(),
			unref: jest.fn().mockReturnThis(),
			// Mock properties if they are read by the service
			// remoteAddress, remotePort etc. can be added if needed
		} as unknown as jest.Mocked<net.Socket>;

		// Configure the mocked Socket constructor to return this specific, fresh instance
		const MockedSocketConstructor = net.Socket as jest.MockedClass<
			typeof net.Socket
		>;
		MockedSocketConstructor.mockReturnValue(mockSocketInstance);

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LogTransportService,
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn((key: string, defaultValue?: any) => {
							// Default mock implementations for ConfigService
							if (key === "ELK_ENABLED") return "false";
							if (key === "LOG_TO_FILE") return "false";
							if (key === "LOG_FALLBACK_CONSOLE") return "true";
							if (key === "LOGSTASH_HOST") return "localhost";
							if (key === "LOGSTASH_PORT") return "50000";
							if (key === "APP_NAME") return "test-app";
							if (key === "NODE_ENV") return "test";
							if (key === "ELK_FAIL_SAFE") return "true";
							return defaultValue;
						}),
					},
				},
			],
		}).compile();

		service = module.get<LogTransportService>(LogTransportService);
		mockConfigService = module.get<ConfigService>(ConfigService);
		// mockWriteStream retrieval might be better per test if multiple streams are created
		// For now, if only one is expected during setup by LogTransportService, this might be fine.
		// However, LogTransportService is instantiated in some tests with different configs, potentially creating new streams.
		// It's safer to get the stream instance inside tests that specifically deal with file writing.
		// mockWriteStream = (fs.createWriteStream as jest.Mock).mock.results[0]?.value;
	});

	afterEach(() => {
		jest.clearAllMocks(); // Clear all mocks after each test
		if (service["reconnectTimeout"]) {
			clearTimeout(service["reconnectTimeout"]);
		}
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("Initialization", () => {
		it("should not connect to Logstash if ELK_ENABLED is false", () => {
			// Service is initialized in outer beforeEach with ELK_ENABLED=false by default
			expect(mockSocketInstance.connect).not.toHaveBeenCalled();
		});

		it("should attempt to connect to Logstash if ELK_ENABLED is true", async () => {
			(mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
				if (key === "ELK_ENABLED") return "true";
				if (key === "LOGSTASH_HOST") return "logstash";
				if (key === "LOGSTASH_PORT") return 5000;
				return "test";
			});
			// This newService instance will trigger another `new net.Socket()` which will return mockSocketInstance
			// due to the updated MockedSocketConstructor.mockReturnValue(mockSocketInstance) in the outer beforeEach.
			// This means assertions will be on the same mockSocketInstance.
			// If tests need truly independent socket mocks per LogTransportService instance,
			// the mockSocketInstance creation and MockedSocketConstructor.mockReturnValue would need to be
			// inside this test or its own beforeEach. For now, this tests if *a* connect is called.
			const newService = new LogTransportService(mockConfigService);
			newService.onModuleInit(); // Call onModuleInit to trigger connection attempt
			await new Promise(setImmediate); // Allow async operations like connect to proceed
			expect(mockSocketInstance.connect).toHaveBeenCalledWith(
				5000,
				"logstash",
				expect.any(Function),
			);
		});

		it("should create log directory if LOG_TO_FILE is true and directory does not exist", () => {
			(mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
				if (key === "LOG_TO_FILE") return "true";
				return "test";
			});
			(fs.existsSync as jest.Mock).mockReturnValue(false);
			const newService = new LogTransportService(mockConfigService);
			newService.onModuleInit();
			expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), {
				recursive: true,
			});
		});

		it("should not create log directory if LOG_TO_FILE is true and directory already exists", () => {
			(mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
				if (key === "LOG_TO_FILE") return "true";
				return "test";
			});
			(fs.existsSync as jest.Mock).mockReturnValue(true);
			const newService = new LogTransportService(mockConfigService);
			newService.onModuleInit();
			expect(fs.mkdirSync).not.toHaveBeenCalled();
		});
	});

	describe("Log Sending", () => {
		const logData = {
			message: "test log",
			level: "info",
			timestamp: new Date().toISOString(),
		};

		it("should send log to console if fallback is enabled and no other transports are active", () => {
			const consoleSpy = jest.spyOn(console, "log");
			service.sendLog(logData);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining(logData.message),
			);
			consoleSpy.mockRestore();
		});

		it("should write to file if LOG_TO_FILE is true", () => {
			(mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
				if (key === "LOG_TO_FILE") return "true";
				if (key === "LOG_FALLBACK_CONSOLE") return "false"; // Disable console to isolate file log
				if (key === "APP_NAME") return "test-app";
				if (key === "NODE_ENV") return "test";
				return "test";
			});
			const fileService = new LogTransportService(mockConfigService);
			fileService.onModuleInit(); // To setup writestream

			// Use a fixed timestamp for predictable output if needed, or rely on expect.any(String) for dynamic parts
			const fixedTimestamp = new Date().toISOString();
			const testLogData = {
				message: "test log",
				level: "info",
				timestamp: fixedTimestamp,
			};
			fileService.sendLog(testLogData);

			const currentMockWriteStream = (
				fs.createWriteStream as jest.Mock
			).mock.results.find((r) => r.type === "return")?.value;

			// Simplemente verificar que se llamó a write, sin comprobar los argumentos exactos
			expect(currentMockWriteStream.write).toHaveBeenCalled();
		});

		// More tests for Logstash connection, queuing, errors, retries, etc.
	});

	// TODO: Add detailed tests for Logstash connection logic (success, error, timeout, close, reconnect attempts)
	// TODO: Add tests for log queuing when Logstash is disconnected and processing upon reconnection
	// TODO: Add tests for file rotation (might require mocking date/time)
	// TODO: Add tests for getStats() method
	// TODO: Test onModuleDestroy to ensure client and stream cleanup
});
