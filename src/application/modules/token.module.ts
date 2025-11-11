import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { Employee } from "../../domain/entities";
import { TokenService } from "../services/token.service";

@Module({
	imports: [
		TypeOrmModule.forFeature([Employee]),
		JwtModule.register({
			secret: "test_token",
			signOptions: { expiresIn: "1d" },
		}),
	],
	providers: [TokenService],
	exports: [TokenService, JwtModule],
})
export class TokenModule {}