import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PassportModule } from "@nestjs/passport";
import { Employee } from "../../domain/entities";
import { EmployeeCredentials } from "../../domain/entities/employee-credentials.entity";
import { RefreshToken } from "../../domain/entities";
import { AuthController } from "../../interface/controllers/auth.controller";
import { JwtStrategy } from "../strategies/jwt.strategy";
import { AuthenticateEmployeeUseCase } from "../use-cases/auth/authenticate-employee.use-case";
import { EmployeeRepository } from "../../infrastructure/repositories/employee.repository";
import { TokenModule } from "./token.module";
import { AuthService } from "../services/auth.service";
import { EmployeeModule } from "./employee.module";
import { SmsService } from "../services/sms.service";

@Module({
	imports: [
		PassportModule,
		JwtModule.registerAsync({
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				secret: configService.get<string>("JWT_SECRET", "supersecret"),
				signOptions: { expiresIn: "1d" },
			}),
		}),
		TypeOrmModule.forFeature([Employee, EmployeeCredentials, RefreshToken]),
		TokenModule,
		EmployeeModule,
	],
	controllers: [AuthController],
	providers: [
		AuthService,
		SmsService,
		JwtStrategy,
		AuthenticateEmployeeUseCase,
		EmployeeRepository,
		{
			provide: "IEmployeeRepository",
			useClass: EmployeeRepository,
		},
	],
	exports: [JwtStrategy, JwtModule, AuthService],
})
export class AuthModule {}
