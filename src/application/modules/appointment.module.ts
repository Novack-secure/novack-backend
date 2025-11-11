import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Appointment, Visitor, Employee } from "src/domain/entities";
import { AppointmentService } from "../services/appointment.service";
import { AppointmentController } from "src/interface/controllers/appointment.controller";
import { TokenModule } from "./token.module";
import { CardModule } from "./card.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([Appointment, Visitor, Employee]),
		TokenModule, // Necesario para AuthGuard
		forwardRef(() => CardModule), // Necesario para asignar tarjetas en check-in
	],
	controllers: [AppointmentController],
	providers: [AppointmentService],
	exports: [AppointmentService],
})
export class AppointmentModule {}
