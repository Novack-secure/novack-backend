import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TokenService } from "../services/token.service";
import { RefreshToken } from "../../domain/entities/refresh-token.entity";
import { Employee } from "../../domain/entities";

@Module({
	imports: [
		TypeOrmModule.forFeature([RefreshToken, Employee]),
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				secret: configService.get<string>("JWT_SECRET", "supersecret"),
				signOptions: { expiresIn: "1d" },
			}),
		}),
	],
	providers: [TokenService],
	exports: [TokenService, JwtModule],
})
export class TokenModule {}
