import { Test, TestingModule } from "@nestjs/testing";
import { DatabaseResetController } from "../database-reset.controller";
import { DataSource } from "typeorm";
import { HttpStatus } from "@nestjs/common";

describe("DatabaseResetController", () => {
	let controller: DatabaseResetController;
	let mockDataSource: Partial<DataSource>;
	let originalEnv: string | undefined;

	beforeEach(async () => {
		// Mock del entorno para simular ambiente de desarrollo
		originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "development";
		process.env.DB_RESET_SECRET_KEY = "test-secret-key";

		mockDataSource = {
			query: jest.fn().mockResolvedValue(undefined),
			entityMetadatas: [
				{ name: "Employee", tableName: "employees" } as any,
				{ name: "Supplier", tableName: "suppliers" } as any,
				{ name: "Card", tableName: "cards" } as any,
				{ name: "Migration", tableName: "migrations" } as any, // Este debe ser ignorado
			],
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [DatabaseResetController],
			providers: [
				{
					provide: DataSource,
					useValue: mockDataSource,
				},
			],
		}).compile();

		controller = module.get<DatabaseResetController>(DatabaseResetController);
	});

	// Restaurar el entorno después de cada test
	afterEach(() => {
		process.env.NODE_ENV = originalEnv;
		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	describe("resetDatabase", () => {
		it("should return success when reset is successful with valid secret key", async () => {
			const result = await controller.resetDatabase({
				secretKey: "test-secret-key",
			});

			expect(result.success).toBe(true);
			expect(result.status).toBe(HttpStatus.OK);
			expect(mockDataSource.query).toHaveBeenCalledTimes(5); // 2 para FK checks + 3 tablas

			// Verificar que se ignoró la tabla de migraciones
			expect(mockDataSource.query).not.toHaveBeenCalledWith(
				"TRUNCATE TABLE `migrations`",
			);
		});

		it("should return error when secret key is invalid", async () => {
			const result = await controller.resetDatabase({ secretKey: "wrong-key" });

			expect(result.success).toBe(false);
			expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
			expect(mockDataSource.query).not.toHaveBeenCalled();
		});

		it("should not allow reset in production environment", async () => {
			process.env.NODE_ENV = "production";

			const result = await controller.resetDatabase({
				secretKey: "test-secret-key",
			});

			expect(result.success).toBe(false);
			expect(result.status).toBe(HttpStatus.FORBIDDEN);
			expect(mockDataSource.query).not.toHaveBeenCalled();
		});

		it("should handle database errors gracefully", async () => {
			mockDataSource.query = jest
				.fn()
				.mockRejectedValueOnce(new Error("Database error"));

			const result = await controller.resetDatabase({
				secretKey: "test-secret-key",
			});

			expect(result.success).toBe(false);
			expect(result.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(result.message).toContain("Error al limpiar la base de datos");
		});
	});
});
