import { Controller, Get } from "@nestjs/common";
import { PostgresqlDatabaseService } from "./postgresql.database.service";

@Controller("postgresql")
export class PostgresqlDatabaseController {
	constructor(private readonly databaseService: PostgresqlDatabaseService) {}

	@Get("healt")
	testConnection() {
		return this.databaseService.testConnection();
	}
}
