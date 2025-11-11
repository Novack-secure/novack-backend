import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { PreferenceType } from "src/domain/entities";

export class CreateUserPreferenceDto {
	@IsEnum(PreferenceType)
	preference_type: PreferenceType;

	@IsObject()
	preference_value: Record<string, any>;
}

export class UpdateUserPreferenceDto {
	@IsObject()
	@IsOptional()
	preference_value?: Record<string, any>;
}

export class GraphLayoutDto {
	slotOrder: string[];
	slotItems: Record<string, string>;
}
