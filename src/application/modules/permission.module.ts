import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Permission, Employee } from "../../domain/entities";
import { PermissionController } from "../../interface/controllers/permission.controller";
import { PermissionService } from "../services/permission.service";
import { PermissionRepository } from "../../infrastructure/repositories";
import { TokenModule } from "./token.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([Permission, Employee]),
		TokenModule, // Import TokenModule for AuthGuard
	],
	controllers: [PermissionController],
	providers: [
		PermissionService,

		// Repository Implementation
		PermissionRepository,

		// Repository Interface Binding
		{
			provide: "IPermissionRepository",
			useClass: PermissionRepository,
		},
	],
	exports: [
		PermissionService,
		"IPermissionRepository",
	],
})
export class PermissionModule {}
