import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DashboardController } from "src/interface/controllers/dashboard.controller";
import { DashboardService } from "../services/dashboard.service";
import { TokenModule } from "./token.module";
import {
	Employee,
	Visitor,
	Appointment,
	Card,
	ChatRoom,
	ChatMessage,
} from "src/domain/entities";

@Module({
	imports: [
		TypeOrmModule.forFeature([
			Employee,
			Visitor,
			Appointment,
			Card,
			ChatRoom,
			ChatMessage,
		]),
		TokenModule,
	],
	controllers: [DashboardController],
	providers: [DashboardService],
	exports: [DashboardService],
})
export class DashboardModule {}
