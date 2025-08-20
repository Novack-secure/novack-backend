import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Employee } from "../../domain/entities";
import { EmployeeCredentials } from "../../domain/entities/employee-credentials.entity";
import { TwoFactorAuthService } from "../services/two-factor-auth.service";
import { TwoFactorAuthController } from "../../interface/controllers/two-factor-auth.controller";
import { EmailModule } from "./email.module";
import { JwtConfigModule } from "./jwt.module";
import { AuthModule } from "./auth.module";
import { EmployeeRepository } from "../../infrastructure/repositories/employee.repository";
import { TokenModule } from "./token.module";
import { SmsModule } from "./sms.module";
import { RedisDatabaseModule } from "../../infrastructure/database/redis/redis.database.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([Employee, EmployeeCredentials]),
		EmailModule,
		JwtConfigModule,
		forwardRef(() => AuthModule),
		TokenModule,
    SmsModule,
    RedisDatabaseModule,
	],
	controllers: [TwoFactorAuthController],
	providers: [
		TwoFactorAuthService,
		EmployeeRepository,
		{
			provide: "IEmployeeRepository",
			useClass: EmployeeRepository,
		},
	],
	exports: [TwoFactorAuthService],
})
export class TwoFactorAuthModule {}
