import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Visitor } from "src/domain/entities/visitor.entity";
import { IVisitorRepository } from "src/domain/repositories/visitor.repository.interface";
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service";

@Injectable()
export class GetVisitorDetailsUseCase {
	constructor(
		@Inject(IVisitorRepository) // Using the Symbol as DI token
		private readonly visitorRepository: IVisitorRepository,
		private readonly logger: StructuredLoggerService,
	) {
		this.logger.setContext("GetVisitorDetailsUseCase");
	}

	async execute(id: string): Promise<Visitor> {
		this.logger.log(
			`Attempting to fetch visitor details for id: ${id}`,
			undefined,
			{ visitorId: id },
		);

		// It's common for repository findById methods to specify relations to load.
		// Assuming the IVisitorRepository.findById method handles loading necessary relations
		// like 'appointments', 'supplier', 'card' if they are part of the 'Visitor' aggregate root details.
		// If not, and they are needed, the repository method or this use case might need adjustment.
		const visitor = await this.visitorRepository.findById(id);

		if (!visitor) {
			this.logger.warn(`Visitor not found with id: ${id}`, undefined, {
				visitorId: id,
			});
			throw new NotFoundException(`Visitor with ID "${id}" not found`);
		}

		this.logger.log(
			`Successfully fetched visitor details for id: ${id}`,
			undefined,
			{
				visitorId: id,
				// Optionally log some non-sensitive details of the visitor if useful for this log level
				// visitorName: visitor.name
			},
		);
		return visitor;
	}
}
