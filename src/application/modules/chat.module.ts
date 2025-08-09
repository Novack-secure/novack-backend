import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import {
	ChatRoom,
	ChatMessage,
	Employee,
	Visitor,
	Supplier,
  Appointment,
} from "src/domain/entities";
import { ChatService } from "../services/chat.service";
import { SupplierBotService } from "../services/supplier-bot.service";
import { DeepseeClient } from "../services/deepsee.client";
import { ChatController } from "../../interface/controllers/chat.controller";
import { ChatGateway } from "../../infrastructure/websockets/chat.gateway";
import { WsJwtGuard } from "../guards/ws-jwt.guard";
import { RedisDatabaseModule } from "../../infrastructure/database/redis/redis.database.module";
import { AuthModule } from "./auth.module";
import { TokenModule } from "./token.module";
import { SupplierModule } from "./supplier.module";
import { VisitorModule } from "./visitor.module";
import { EmployeeModule } from "./employee.module";
import { ISupplierRepository } from "src/domain/repositories/supplier.repository.interface";
import { IAppointmentRepository } from "src/domain/repositories/appointment.repository.interface";
import { IEmployeeRepository } from "src/domain/repositories/employee.repository.interface";
import { IVisitorRepository } from "src/domain/repositories/visitor.repository.interface";
import { SupplierRepository } from "src/infrastructure/repositories/supplier.repository";
import { AppointmentRepository } from "src/infrastructure/repositories/appointment.repository";
import { EmployeeRepository } from "src/infrastructure/repositories/employee.repository";
import { VisitorRepository } from "src/infrastructure/repositories/visitor.repository";

@Module({
	imports: [
		TypeOrmModule.forFeature([
			ChatRoom,
			ChatMessage,
			Employee,
			Visitor,
			Supplier,
      Appointment,
		]),
		RedisDatabaseModule,
		AuthModule,
		TokenModule,
      // Importar módulos que ya proveen los repositorios de dominio
      SupplierModule,
      VisitorModule,
      EmployeeModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				secret: configService.get("JWT_SECRET"),
				signOptions: { expiresIn: "1d" },
			}),
		}),
	],
	controllers: [ChatController],
  providers: [
    ChatService,
    ChatGateway,
    WsJwtGuard,
    SupplierBotService,
    DeepseeClient,
    // Repositorios ya provistos por SupplierModule/VisitorModule; no redefinir aquí
  ],
	exports: [ChatService],
})
export class ChatModule {}
