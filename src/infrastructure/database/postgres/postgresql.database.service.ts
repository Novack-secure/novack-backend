import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";

@Injectable()
export class PostgresqlDatabaseService implements OnModuleInit {
	private readonly logger = new Logger(PostgresqlDatabaseService.name);

	constructor(private dataSource: DataSource) {}

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
			return {
				success: true,
				timestamp: result[0].now,
				message: "Database connection successful",
			};
		} catch (error) {
			this.logger.error("Database connection test failed:", error.message);
			return {
				success: false,
				error: error.message,
				message: "Database connection failed",
			};
		}
	}
}
