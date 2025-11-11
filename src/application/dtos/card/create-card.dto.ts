import {
	IsBoolean,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsUUID,
	IsInt,
	Min,
	Max,
	IsEnum,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateCardDto {
	@ApiProperty({
		description: "ID del proveedor al que pertenece la tarjeta",
		example: "550e8400-e29b-41d4-a716-446655440000",
	})
	@IsUUID()
	@IsNotEmpty()
	supplier_id: string;

	@ApiProperty({
		description: "UUID único de la tarjeta NFC/RFID",
		example: "04:5A:3B:F2:C1:80:80",
		required: true,
	})
	@IsString()
	@IsNotEmpty()
	card_uuid: string;

	@ApiProperty({
		description: "Número único de la tarjeta",
		example: "CARD-001",
		required: false,
	})
	@IsString()
	@IsOptional()
	card_number?: string;

	@ApiProperty({
		description: "Indica si la tarjeta está activa",
		example: true,
		required: false,
		default: true,
	})
	@IsBoolean()
	@IsOptional()
	is_active?: boolean;

	@ApiProperty({
		description: "Estado de la tarjeta",
		example: "active",
		enum: ["active", "inactive", "lost", "damaged", "assigned", "available"],
		required: false,
		default: "active",
	})
	@IsEnum(["active", "inactive", "lost", "damaged", "assigned", "available"])
	@IsOptional()
	status?: string;

	@ApiProperty({
		description: "Porcentaje de batería de la tarjeta",
		example: 100,
		required: false,
		default: 100,
	})
	@IsInt()
	@Min(0)
	@Max(100)
	@IsOptional()
	battery_percentage?: number;

	@ApiProperty({
		description: "Fecha de expiración de la tarjeta",
		example: "2025-12-31T23:59:59Z",
		required: false,
	})
	@IsOptional()
	expires_at?: Date;
}
