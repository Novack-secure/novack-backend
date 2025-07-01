import {
	Controller,
	Post,
	HttpCode,
	HttpStatus,
	Body,
	Logger,
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

interface ResetDatabaseDto {
	secretKey: string;
}

@ApiTags("database-management")
@Controller("database")
export class DatabaseResetController {
	private readonly logger = new Logger(DatabaseResetController.name);

	constructor(
		@InjectDataSource()
		private dataSource: DataSource,
	) {}

	@Post("reset")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Resetea la base de datos",
		description:
			"Elimina todos los datos de la base de datos y la deja en estado inicial. Solo para ambiente de desarrollo.",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Base de datos limpiada correctamente",
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Clave secreta incorrecta",
	})
	async resetDatabase(@Body() resetDto: ResetDatabaseDto) {
		// Verificar que esté en ambiente de desarrollo
		if (process.env.NODE_ENV !== "development") {
			this.logger.warn("Intento de reseteo de base en ambiente no-desarrollo");
			return {
				success: false,
				message:
					"Esta operación solo está disponible en ambiente de desarrollo",
				status: HttpStatus.FORBIDDEN,
			};
		}

		// Verificar clave secreta
		const secretKey = process.env.DB_RESET_SECRET_KEY || "dev-reset-key";
		if (resetDto.secretKey !== secretKey) {
			this.logger.warn("Intento de reseteo de base con clave incorrecta");
			return {
				success: false,
				message: "Clave secreta incorrecta",
				status: HttpStatus.UNAUTHORIZED,
			};
		}

		try {
			// Obtener todas las entidades
			const entities = this.dataSource.entityMetadatas;

			// Desactivar verificación de claves foráneas temporalmente
			await this.dataSource.query("SET FOREIGN_KEY_CHECKS = 0");

			for (const entity of entities) {
				// Omitir entidades de migraciones u otras que no deban resetearse
				if (entity.name.includes("Migration")) {
					continue;
				}

				// Truncar cada tabla
				const tableName = entity.tableName;
				this.logger.log(`Limpiando tabla: ${tableName}`);
				await this.dataSource.query(`TRUNCATE TABLE \`${tableName}\``);
			}

			// Reactivar verificación de claves foráneas
			await this.dataSource.query("SET FOREIGN_KEY_CHECKS = 1");

			this.logger.log("Base de datos limpiada correctamente");
			return {
				success: true,
				message: "Base de datos limpiada correctamente",
				status: HttpStatus.OK,
			};
		} catch (error) {
			// Determinar si estamos en un entorno de pruebas
			// Simplemente verificamos si jest está en ejecución
			const isRunningInJest = typeof process.env.JEST_WORKER_ID !== "undefined";

			if (isRunningInJest) {
				// En pruebas, usamos debug en lugar de error para no mostrar errores en los logs de test
				// Algunos errores son esperados en pruebas y no queremos contaminar los logs
				this.logger.debug(
					"Error simulado al limpiar la base de datos durante pruebas",
				);
			} else {
				this.logger.error("Error al limpiar la base de datos", error);
			}

			return {
				success: false,
				message: "Error al limpiar la base de datos: " + error.message,
				status: HttpStatus.INTERNAL_SERVER_ERROR,
			};
		}
	}
}
