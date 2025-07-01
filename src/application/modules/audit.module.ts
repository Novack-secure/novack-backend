import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLog } from "../../domain/entities/audit-log.entity";
import { AuditService } from "../services/audit.service";
import { EncryptionModule } from "./encryption.module";

@Module({
	imports: [TypeOrmModule.forFeature([AuditLog]), EncryptionModule],
	providers: [AuditService],
	exports: [AuditService],
})
export class AuditModule {}
