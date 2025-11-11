import { IsArray, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AssignPermissionsDto {
	@ApiProperty({
		description: "IDs de los permisos a asignar",
		example: [
			"123e4567-e89b-12d3-a456-426614174000",
			"223e4567-e89b-12d3-a456-426614174001",
		],
		type: [String],
	})
	@IsArray()
	@IsUUID("4", { each: true })
	permission_ids: string[];
}
