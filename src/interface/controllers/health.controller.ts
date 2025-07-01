import { Controller, Get } from "@nestjs/common";
import { LogTransportService } from "src/infrastructure/logging/log-transport.service";

@Controller("health")
export class HealthController {
	constructor(private readonly logTransportService: LogTransportService) {}

	@Get()
	getHealth() {
		const logStats = this.logTransportService.getStats();

		return {
			status: "ok",
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			memory: process.memoryUsage(),
			logging: logStats,
		};
	}

	@Get("ready")
	getReadiness() {
		return {
			status: "ready",
			timestamp: new Date().toISOString(),
			database: "connected",
			logging: this.logTransportService.getStats(),
		};
	}
}
