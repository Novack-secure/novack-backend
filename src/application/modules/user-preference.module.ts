import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserPreference } from "src/domain/entities";
import { UserPreferenceService } from "../services/user-preference.service";
import { UserPreferenceController } from "src/interface/controllers/user-preference.controller";
import { TokenModule } from "./token.module";

@Module({
	imports: [TypeOrmModule.forFeature([UserPreference]), TokenModule],
	controllers: [UserPreferenceController],
	providers: [UserPreferenceService],
	exports: [UserPreferenceService],
})
export class UserPreferenceModule {}
