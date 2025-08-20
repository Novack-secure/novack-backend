import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Employee, Supplier } from "../../domain/entities"; // Adjusted path
import { EmployeeCredentials } from "../../domain/entities/employee-credentials.entity";
import { EmployeeController } from "../../interface/controllers/employee.controller"; // Adjusted path
import { EmployeeService } from "../services/employee.service";

// Use Cases (ensure index file exports all of them)
import {
	CreateEmployeeUseCase,
	GetAllEmployeesUseCase,
	GetEmployeeByIdUseCase,
	UpdateEmployeeUseCase,
	DeleteEmployeeUseCase,
	GetEmployeesBySupplierUseCase,
	GetEmployeeByEmailUseCase,
	MarkEmployeeEmailAsVerifiedUseCase,
	UpdateEmployeeProfileImageUseCase,
} from "../use-cases/employee";

// Repositories - Interface & Implementation
import {
	IEmployeeRepository,
	ISupplierRepository,
} from "../../domain/repositories"; // Ruta corregida
import {
	EmployeeRepository,
	SupplierRepository,
} from "../../infrastructure/repositories"; // Ruta corregida

// Other necessary modules
import { TokenModule } from "./token.module"; // Retained
import { RedisDatabaseModule } from "../../infrastructure/database/redis/redis.database.module";
import { FileStorageModule } from "./file-storage.module"; // Retained for controller
// Assuming SupplierModule exists and provides ISupplierRepository
import { SupplierModule } from "./supplier.module";
// Assuming EmailModule exists and provides EmailService, if not, EmailService needs to be provided here.
// For now, let's assume EmailService is provided globally or by another imported module if needed by Employee use cases.
// The current Employee use cases don't directly inject EmailService, but MarkEmployeeEmailAsVerifiedUseCase might imply it.
// Re-checking: MarkEmployeeEmailAsVerifiedUseCase does NOT use EmailService. It's EmailVerificationService that does.

@Module({
	imports: [
		TypeOrmModule.forFeature([Employee, EmployeeCredentials, Supplier]),
		TokenModule,
		FileStorageModule,
		forwardRef(() => SupplierModule), // Usando forwardRef para resolver la dependencia circular
		RedisDatabaseModule,
	],
	controllers: [EmployeeController],
	providers: [
		// Añadiendo EmployeeService nuevamente
		EmployeeService,

		// All Employee Use Cases
		CreateEmployeeUseCase, // Was already partially there
		GetAllEmployeesUseCase,
		GetEmployeeByIdUseCase,
		UpdateEmployeeUseCase,
		DeleteEmployeeUseCase,
		GetEmployeesBySupplierUseCase,
		GetEmployeeByEmailUseCase,
		MarkEmployeeEmailAsVerifiedUseCase,
		UpdateEmployeeProfileImageUseCase,

		// Repository Implementation (needed for the binding below)
		EmployeeRepository,
		// If SupplierModule doesn't export ISupplierRepository with its concrete class,
		// and GetEmployeesBySupplierUseCase needs ISupplierRepository, we might need to provide it here.
		// However, the cleaner way is SupplierModule providing it.
		// For now, assuming SupplierModule handles the ISupplierRepository binding.

		// Repository Interface Binding
		{
			provide: "IEmployeeRepository", // Usando string en lugar de símbolo para coincidir con cómo se inyecta en EmployeeService
			useClass: EmployeeRepository,
		},
		// Mantenemos también la inyección usando símbolo para los use cases que lo requieran
		{
			provide: IEmployeeRepository,
			useClass: EmployeeRepository,
		},
	],
	exports: [
		// Exportando EmployeeService para que sea accesible desde otros módulos
		EmployeeService,
		// Export the repository interface token if other modules need to inject it.
		"IEmployeeRepository", // Exportando como string
		IEmployeeRepository, // Exportando también como símbolo para mantener compatibilidad
	],
})
export class EmployeeModule {}
