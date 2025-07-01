import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Visitor } from 'src/domain/entities/visitor.entity';
import { IVisitorRepository } from 'src/domain/repositories/visitor.repository.interface';
import { ISupplierRepository } from 'src/domain/repositories/supplier.repository.interface';
import { StructuredLoggerService } from 'src/infrastructure/logging/structured-logger.service';

@Injectable()
export class GetVisitorsBySupplierUseCase {
  constructor(
    @Inject(IVisitorRepository)
    private readonly visitorRepository: IVisitorRepository,
    @Inject(ISupplierRepository)
    private readonly supplierRepository: ISupplierRepository,
    private readonly logger: StructuredLoggerService,
  ) {
    this.logger.setContext('GetVisitorsBySupplierUseCase');
  }

  async execute(supplierId: string): Promise<Visitor[]> {
    this.logger.log(
      `Attempting to fetch visitors for supplier id: ${supplierId}`,
      undefined,
      { supplierId },
    );

    // Optional: Verify supplier exists.
    // This adds an extra DB call but ensures supplierId is valid.
    // If IVisitorRepository.findBySupplier handles non-existent suppliers gracefully (e.g., returns empty array),
    // this check might be considered optional depending on desired strictness.
    // For this implementation, we'll verify the supplier first.
    const supplier = await this.supplierRepository.findById(supplierId);
    if (!supplier) {
      this.logger.warn(
        `Supplier not found when attempting to fetch its visitors: ${supplierId}`,
        undefined,
        { supplierId },
      );
      // Depending on requirements, could throw NotFoundException or return empty array.
      // Throwing NotFoundException is safer to indicate the primary resource (supplier) is missing.
      throw new NotFoundException(
        `Supplier with ID "${supplierId}" not found.`,
      );
    }

    // The IVisitorRepository.findBySupplier method should handle loading necessary relations
    // if they are expected as part of this list view (e.g., 'card', 'appointments' summary).
    const visitors = await this.visitorRepository.findBySupplier(supplierId);

    this.logger.log(
      `Successfully fetched ${visitors.length} visitors for supplier id: ${supplierId}`,
      undefined,
      {
        supplierId,
        count: visitors.length,
      },
    );
    return visitors;
  }
}
