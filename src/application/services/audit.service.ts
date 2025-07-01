import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from 'src/domain/entities/audit-log.entity';
import { AuditInfo } from '../decorators/audit-access.decorator';
import { EncryptionService } from './encryption.service';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Registra un acceso a datos sensibles en la auditoría
   * @param auditInfo Información de auditoría a registrar
   */
  async logAccess(auditInfo: AuditInfo): Promise<void> {
    try {
      // Encriptar datos sensibles adicionales antes de guardar
      const encryptedAdditionalData = auditInfo.additionalData
        ? this.encryptionService.encrypt(auditInfo.additionalData)
        : null;

      const auditLog = this.auditLogRepository.create({
        user_id: auditInfo.user.id,
        user_email: auditInfo.user.email,
        action: auditInfo.action,
        resource_type: auditInfo.resourceType,
        resource_id: auditInfo.resourceId,
        ip_address: auditInfo.ipAddress,
        user_agent: auditInfo.userAgent,
        additional_data: encryptedAdditionalData,
        timestamp: new Date(),
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      // Loguear pero no lanzar, para no interrumpir flujos críticos
      console.error('Error al registrar auditoría:', error);
    }
  }

  /**
   * Consulta registros de auditoría con filtros
   */
  async findAuditLogs(filters: {
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      userId,
      resourceType,
      resourceId,
      action,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;

    const queryBuilder =
      this.auditLogRepository.createQueryBuilder('audit_log');

    // Aplicar filtros
    if (userId) {
      queryBuilder.andWhere('audit_log.user_id = :userId', { userId });
    }

    if (resourceType) {
      queryBuilder.andWhere('audit_log.resource_type = :resourceType', {
        resourceType,
      });
    }

    if (resourceId) {
      queryBuilder.andWhere('audit_log.resource_id = :resourceId', {
        resourceId,
      });
    }

    if (action) {
      queryBuilder.andWhere('audit_log.action = :action', { action });
    }

    if (startDate) {
      queryBuilder.andWhere('audit_log.timestamp >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('audit_log.timestamp <= :endDate', { endDate });
    }

    // Paginación
    queryBuilder
      .orderBy('audit_log.timestamp', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    // Ejecutar consulta
    const [logs, total] = await queryBuilder.getManyAndCount();

    // Descifrar datos adicionales si existen
    const processedLogs = logs.map((log) => {
      let parsedData = null;
      if (log.additional_data) {
        try {
          // Descifrar pero no asignar directamente al campo string
          const decryptedData = this.encryptionService.decrypt(
            log.additional_data,
            false,
          );
          // Parsear el string descifrado
          parsedData =
            typeof decryptedData === 'string'
              ? JSON.parse(decryptedData)
              : null;
        } catch (error) {
          console.error(
            `Error al descifrar datos adicionales ID: ${log.id}`,
            error,
          );
          parsedData = { error: 'Error al descifrar datos' };
        }
      }

      // Devuelve un nuevo objeto con los datos descifrados separados
      return {
        ...log,
        additional_data_parsed: parsedData,
      };
    });

    return {
      logs: processedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
