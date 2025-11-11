import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Visitor } from "src/domain/entities/visitor.entity"; // Fixed path
import { IVisitorRepository } from "src/domain/repositories/visitor.repository.interface"; // Fixed path
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service"; // Fixed path

@Injectable()
export class UpdateVisitorProfileImageUseCase {
	constructor(
		@Inject(IVisitorRepository)
		private readonly visitorRepository: IVisitorRepository,
		private readonly logger: StructuredLoggerService,
	) {
		this.logger.setContext("UpdateVisitorProfileImageUseCase");
	}

	async execute(id: string, imageUrl: string): Promise<Visitor> {
		this.logger.log(
			`Attempting to update profile image URL for visitor id: ${id}`,
			undefined,
			{
				visitorId: id,
				// Avoid logging the full imageUrl if it could be very long or sensitive in some contexts,
				// or ensure it's appropriately handled by the logger's sanitization if any.
				// For now, logging it as per typical practice.
				newImageUrl: imageUrl,
			},
		);

		const visitor = await this.visitorRepository.findById(id);
		if (!visitor) {
			this.logger.warn(
				`Visitor not found for profile image update with id: ${id}`,
				undefined,
				{ visitorId: id },
			);
			throw new NotFoundException(`Visitor with ID "${id}" not found`);
		}

		visitor.profile_image_url = imageUrl;

		// The save method should persist the change and return the updated entity.
		// Depending on repository implementation, it might automatically include relations or just the updated visitor fields.
		const updatedVisitor = await this.visitorRepository.save(visitor);

		this.logger.log(
			`Successfully updated profile image URL for visitor id: ${id}`,
			undefined,
			{
				visitorId: id,
				updatedImageUrl: updatedVisitor.profile_image_url, // Log the actual URL set
			},
		);
		return updatedVisitor;
	}
}
