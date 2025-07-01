import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { CardService } from "../services/card.service";
import { CardController } from "../../interface/controllers/card.controller";
import { Card, CardLocation, Supplier, Visitor } from "src/domain/entities";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CardSchedulerModule } from "./card-scheduler.module";
import { RedisDatabaseModule } from "../../infrastructure/database/redis/redis.database.module";
import { AuthModule } from "./auth.module";
import { TokenModule } from "./token.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([Card, CardLocation, Supplier, Visitor]),
		RedisDatabaseModule,
		forwardRef(() => AuthModule),
		TokenModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				secret: configService.get<string>("JWT_SECRET", "supersecret"),
				signOptions: { expiresIn: "1d" },
			}),
		}),
		forwardRef(() => CardSchedulerModule),
	],
	controllers: [CardController],
	providers: [CardService],
	exports: [CardService],
})
export class CardModule {}
