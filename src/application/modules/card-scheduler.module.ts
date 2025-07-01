import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ScheduleModule } from "@nestjs/schedule";
import { Card, CardLocation, Visitor, Appointment } from "src/domain/entities";
import { CardSchedulerService } from "../services/card-scheduler.service";
import { CardModule } from "./card.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TokenModule } from "./token.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([Card, CardLocation, Visitor, Appointment]),
		TokenModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				secret: configService.get<string>("JWT_SECRET", "supersecret"),
				signOptions: { expiresIn: "1d" },
			}),
		}),
		ScheduleModule.forRoot(),
		forwardRef(() => CardModule),
	],
	providers: [CardSchedulerService],
	exports: [CardSchedulerService],
})
export class CardSchedulerModule {}
