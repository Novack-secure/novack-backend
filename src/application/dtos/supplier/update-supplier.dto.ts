import {
	IsOptional,
	IsString,
	IsBoolean,
	IsInt,
	IsEmail,
	ValidateIf,
	IsNumber,
	IsObject,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateSupplierDto {
	@ApiPropertyOptional({
		description: "Nombre del proveedor",
		example: "Acme Corporation",
	})
	@IsOptional()
	@IsString()
	supplier_name?: string;

	@ApiPropertyOptional({
		description: "Nombre del creador/responsable del proveedor",
		example: "John Doe",
	})
	@IsOptional()
	@IsString()
	supplier_creator?: string;

	@ApiPropertyOptional({
		description: "Email de contacto del proveedor",
		example: "contact@acme.com",
	})
	@IsOptional()
	@IsEmail()
	contact_email?: string;

	@ApiPropertyOptional({
		description: "Número de teléfono del proveedor",
		example: "+1 (555) 123-4567",
	})
	@IsOptional()
	@IsString()
	phone_number?: string;

	@ApiPropertyOptional({
		description: "Dirección del proveedor",
		example: "123 Main St, City, Country",
	})
	@IsOptional()
	@IsString()
	address?: string;

	@ApiPropertyOptional({
		description: "Descripción del proveedor",
		example: "Proveedor de servicios de seguridad",
	})
	@IsOptional()
	@IsString()
	description?: string;

	@ApiPropertyOptional({
		description: "URL del logo del proveedor",
		example: "https://example.com/logo.png",
	})
	@IsOptional()
	@IsString()
	logo_url?: string;

	@ApiPropertyOptional({
		description: "Información adicional del proveedor (JSON)",
		example: { sector: "Tecnología", fundacion: 1990 },
	})
	@IsObject()
	@IsOptional()
	additional_info?: Record<string, any> | string;

	@ApiPropertyOptional({
		description: "Indica si el proveedor tiene suscripción activa",
		example: true,
	})
	@IsOptional()
	@IsBoolean()
	is_subscribed?: boolean;

	@ApiPropertyOptional({
		description: "Indica si el proveedor tiene suscripción de tarjetas",
		example: true,
	})
	@IsOptional()
	@IsBoolean()
	@ValidateIf((o) => o.is_subscribed === true || o.is_subscribed === undefined)
	has_card_subscription?: boolean;

	@ApiPropertyOptional({
		description: "Indica si el proveedor tiene suscripción de sensores",
		example: false,
	})
	@IsOptional()
	@IsBoolean()
	@ValidateIf((o) => o.is_subscribed === true || o.is_subscribed === undefined)
	has_sensor_subscription?: boolean;

	@ApiPropertyOptional({
		description: "Cantidad de tarjetas permitidas",
		example: 50,
	})
	@IsOptional()
	@IsNumber()
	card_count?: number;

	@ApiPropertyOptional({
		description: "Cantidad de empleados permitidos",
		example: 10,
	})
	@IsOptional()
	@IsNumber()
	employee_count?: number;
}
