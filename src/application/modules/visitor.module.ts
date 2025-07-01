import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// VisitorService is removed
import { VisitorController } from '../../interface/controllers/visitor.controller';
import { Visitor, Supplier, Appointment } from '../../domain/entities'; // Corregida la ruta de importación
import { SupplierSubscription } from '../../domain/entities/supplier-subscription.entity'; // Importando SupplierSubscription
import { EmailService } from '../services/email.service'; // Kept as it's used by use cases
import { CardModule } from './card.module'; // Used by use cases (CardService)
import { FileStorageModule } from './file-storage.module'; // Used by VisitorController
import { ImageProcessingPipe } from '../pipes/image-processing.pipe'; // Used by VisitorController
// TokenModule is kept, assuming it might be used elsewhere or for future features.
import { TokenModule } from './token.module';
import { SupplierModule } from './supplier.module'; // Importando SupplierModule

// Import Use Cases
import {
  CreateVisitorAndAppointmentUseCase,
  GetAllVisitorsUseCase,
  GetVisitorDetailsUseCase,
  UpdateVisitorAndAppointmentUseCase,
  DeleteVisitorUseCase,
  CheckOutVisitorUseCase,
  GetVisitorsBySupplierUseCase,
  UpdateVisitorProfileImageUseCase,
} from '../use-cases/visitor';

// Import Repository Interfaces (Symbols)
import {
  IVisitorRepository,
  IAppointmentRepository,
  ISupplierRepository,
} from '../../domain/repositories'; // Corregida la ruta de importación

// Import Concrete Repository Implementations
import {
  VisitorRepository,
  AppointmentRepository,
  // SupplierRepository se usará desde SupplierModule
} from '../../infrastructure/repositories'; // Corregida la ruta de importación

// Potentially import SupplierModule and EmailModule if they exist and provide services/repositories
// import { SupplierModule } from './supplier.module';
// import { EmailModule } from './email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Visitor,
      Supplier,
      Appointment,
      SupplierSubscription,
    ]),
    CardModule, // Provides CardService
    FileStorageModule, // Provides FileStorageService
    TokenModule, // Retained
    SupplierModule, // Importando SupplierModule para tener acceso a ISupplierRepository
    // EmailModule,    // If this module provided EmailService
  ],
  controllers: [VisitorController],
  providers: [
    // Register all use cases
    CreateVisitorAndAppointmentUseCase,
    GetAllVisitorsUseCase,
    GetVisitorDetailsUseCase,
    UpdateVisitorAndAppointmentUseCase,
    DeleteVisitorUseCase,
    CheckOutVisitorUseCase,
    GetVisitorsBySupplierUseCase,
    UpdateVisitorProfileImageUseCase,

    // Bind repository interfaces to their concrete implementations
    { provide: IVisitorRepository, useClass: VisitorRepository },
    { provide: IAppointmentRepository, useClass: AppointmentRepository },
    // Ya no proporcionamos ISupplierRepository aquí, lo usamos del SupplierModule

    EmailService, // Provide EmailService here if not imported from a dedicated EmailModule
    ImageProcessingPipe, // Pipe used by VisitorController
  ],
  exports: [
    // VisitorService is removed
    // Typically, use cases are not exported from feature modules unless shared.
  ],
})
export class VisitorModule {}
