import { PartialType } from "@nestjs/mapped-types";
import { CreateCardDto } from "./create-card.dto";
import {
	IsBoolean,
	IsDate,
	IsOptional,
	IsString,
	IsUUID,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateCardDto extends PartialType(CreateCardDto) {
	@ApiProperty({
		description: "Número único de la tarjeta",
		example: "CARD-001",
		required: false,
	})
	@IsString()
	@IsOptional()
	card_number?: string;

	@ApiProperty({
		description: "ID del proveedor al que pertenece la tarjeta",
		example: "550e8400-e29b-41d4-a716-446655440000",
		required: false,
	})
	@IsUUID()
	@IsOptional()
	supplier_id?: string;

	@ApiProperty({
		description: "Indica si la tarjeta está activa",
		example: true,
		required: false,
	})
	@IsBoolean()
	@IsOptional()
	is_active?: boolean;

	@ApiProperty({
		description: "Fecha de expiración de la tarjeta",
		example: "2025-12-31T23:59:59Z",
		required: false,
	})
	@IsDate()
	@IsOptional()
	expires_at?: Date;
}
