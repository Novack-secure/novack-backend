import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";

/**
 * Servicio para gestionar la conexión a PostgreSQL
 * Proporciona métodos para verificar la conexión y ejecutar consultas
 */
@Injectable()
export class PostgresqlDatabaseService implements OnModuleInit {
	private readonly logger = new Logger(PostgresqlDatabaseService.name);

	constructor(
		private dataSource: DataSource,
		private configService: ConfigService
	) {}

	async onModuleInit() {
		try {
			if (!this.dataSource.isInitialized) {
				await this.dataSource.initialize();
			}
			const result = await this.dataSource.query("SELECT NOW()");
			this.logger.log("✅ Database connection test successful");
			return result;
		} catch (error) {
			this.logger.error("❌ Database connection test failed:", error.message);
			throw error;
		}
	}

	async testConnection() {
		try {
			const result = await this.dataSource.query("SELECT NOW()");
			
			// En producción, no mostrar información detallada
			if (this.configService.get('NODE_ENV') === 'production') {
				return {
					success: true,
					message: "Database connection successful",
				};
			}
			
			return {
				success: true,
				timestamp: result[0].now,
				message: "Database connection successful",
			};
		} catch (error) {
			this.logger.error("Database connection test failed:", error.message);
			
			// En producción, no mostrar detalles del error
			if (this.configService.get('NODE_ENV') === 'production') {
				return {
					success: false,
					message: "Database connection failed",
				};
			}
			
			return {
				success: false,
				error: error.message,
				message: "Database connection failed",
			};
		}
	}
}
