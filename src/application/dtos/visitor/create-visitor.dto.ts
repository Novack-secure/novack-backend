import {
	IsString,
	IsEmail,
	IsDate,
	IsUUID,
	IsNotEmpty,
	Matches,
	IsOptional,
	IsObject,
	ValidateIf,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateVisitorDto {
	@ApiProperty({
		description: "Nombre completo del visitante",
		example: "Juan Pérez García",
		minLength: 3,
		maxLength: 100,
	})
	@IsString()
	@IsNotEmpty({ message: "El nombre es requerido" })
	name: string;

	@ApiProperty({
		description: "Correo electrónico del visitante para notificaciones",
		example: "juan.perez@empresa.com",
		format: "email",
	})
	@IsEmail({}, { message: "El correo electrónico debe ser válido" })
	@IsNotEmpty({ message: "El correo electrónico es requerido" })
	email: string;

	@ApiProperty({
		description: "Número de teléfono del visitante (9 dígitos)",
		example: "987654321",
		pattern: "^[0-9]{9}$",
	})
	@IsString()
	@IsNotEmpty({ message: "El teléfono es requerido" })
	@Matches(/^[0-9]{9}$/, { message: "El teléfono debe tener 9 dígitos" })
	phone: string;

	@ApiProperty({
		description: "Ubicación específica donde se encontrará el visitante",
		example: "Sala de Reuniones A - Piso 3",
		minLength: 3,
		maxLength: 100,
	})
	@IsString()
	@IsNotEmpty({ message: "La ubicación es requerida" })
	location: string;

	@ApiPropertyOptional({
		description: `Registro de quejas o comentarios sobre el visitante.
        Formato: { "invitadoX": "descripción" }
        - Si no hay quejas, usar "ninguno"
        - Se pueden registrar múltiples quejas`,
		example: {
			invitado1: "ninguno",
			invitado2: "llegó tarde",
			invitado3: "no respetó el protocolo",
		},
		default: { invitado1: "ninguno" },
	})
	@IsOptional()
	@IsObject({
		message:
			'Las quejas deben ser un objeto con el formato { "invitadoX": "nombre" }',
	})
	complaints?: Record<string, string>;

	@ApiProperty({
		description: "Motivo principal de la visita",
		example: "Reunión de Proyecto",
		minLength: 3,
		maxLength: 100,
	})
	@IsString()
	@IsNotEmpty({ message: "El motivo de la cita es requerido" })
	appointment: string;

	@ApiProperty({
		description: "Descripción detallada del propósito de la visita",
		example:
			"Presentación del avance trimestral del proyecto de automatización",
		minLength: 10,
		maxLength: 500,
	})
	@IsString()
	@IsNotEmpty({ message: "La descripción de la cita es requerida" })
	appointment_description: string;

	@ApiProperty({
		description: "Fecha y hora programada para el inicio de la visita",
		example: "2024-12-30T10:00:00.000Z",
		format: "date-time",
	})
	@Transform(({ value }) => new Date(value))
	@IsDate({ message: "La hora de entrada debe ser una fecha válida" })
	@IsNotEmpty({ message: "La hora de entrada es requerida" })
	check_in_time: Date;

	@ApiPropertyOptional({
		description:
			"Fecha y hora programada para el fin de la visita (debe ser posterior a check_in_time)",
		example: "2024-12-30T11:30:00.000Z",
		format: "date-time",
	})
	@IsOptional()
	@Transform(({ value }) => (value ? new Date(value) : null))
	@IsDate({ message: "La hora de salida debe ser una fecha válida" })
	@ValidateIf(
		(o) => {
			if (!o.check_out_time) return true;
			return o.check_out_time > o.check_in_time;
		},
		{ message: "La hora de salida debe ser posterior a la hora de entrada" },
	)
	check_out_time?: Date;

	@ApiProperty({
		description: "ID UUID del proveedor que el visitante visitará",
		example: "123e4567-e89b-12d3-a456-426614174000",
		format: "uuid",
	})
	@IsUUID()
	@IsNotEmpty({ message: "El ID del proveedor es requerido" })
	supplier_id: string;
}
