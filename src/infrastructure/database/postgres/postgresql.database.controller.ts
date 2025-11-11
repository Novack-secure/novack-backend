import { Controller, Get, UseGuards } from "@nestjs/common";
import { PostgresqlDatabaseService } from "./postgresql.database.service";
import { ConfigService } from "@nestjs/config";
import { Public } from "../../../application/decorators/public.decorator";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

/**
 * Controlador para probar la conexión a PostgreSQL
 * Solo debe estar disponible en entornos de desarrollo
 */
@ApiTags("Database")
@Controller("postgresql")
export class PostgresqlDatabaseController {
	constructor(
		private readonly databaseService: PostgresqlDatabaseService,
		private readonly configService: ConfigService
	) {
		// Desactivar este controlador en producción
		if (this.configService.get('NODE_ENV') === 'production') {
			// Reemplazar el método con una función que devuelve un error
			this.testConnection = async () => ({
				success: false,
				error: 'Este endpoint no está disponible en producción',
				message: 'Acceso denegado en entorno de producción',
				status: 403
			});
		}
	}

	@Get("health")
	@Public()
	@ApiOperation({ summary: "Verificar la conexión a la base de datos" })
	testConnection() {
		return this.databaseService.testConnection();
	}
}
