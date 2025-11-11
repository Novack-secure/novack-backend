import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Role, Permission, Employee } from "../../domain/entities";
import { RoleController } from "../../interface/controllers/role.controller";
import { RoleService } from "../services/role.service";
import {
	RoleRepository,
	PermissionRepository,
} from "../../infrastructure/repositories";
import { TokenModule } from "./token.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([Role, Permission, Employee]),
		TokenModule, // Import TokenModule for AuthGuard
	],
	controllers: [RoleController],
	providers: [
		RoleService,

		// Repository Implementations
		RoleRepository,
		PermissionRepository,

		// Repository Interface Bindings
		{
			provide: "IRoleRepository",
			useClass: RoleRepository,
		},
		{
			provide: "IPermissionRepository",
			useClass: PermissionRepository,
		},
	],
	exports: [
		RoleService,
		"IRoleRepository",
		"IPermissionRepository",
	],
})
export class RoleModule {}
