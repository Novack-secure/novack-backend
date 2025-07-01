import { Module } from "@nestjs/common";
import { HealthController } from "src/interface/controllers/health.controller";

@Module({
	controllers: [HealthController],
})
export class HealthModule {}
