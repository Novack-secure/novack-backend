import { Inject, Injectable } from "@nestjs/common";
import { Visitor } from "src/domain/entities/visitor.entity"; // Fixed path
import { IVisitorRepository } from "src/domain/repositories/visitor.repository.interface"; // Fixed path
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service"; // Fixed path

@Injectable()
export class GetAllVisitorsUseCase {
	constructor(
		@Inject(IVisitorRepository)
		private readonly visitorRepository: IVisitorRepository,
		private readonly logger: StructuredLoggerService,
	) {
		this.logger.setContext("GetAllVisitorsUseCase");
	}

	async execute(): Promise<Visitor[]> {
		this.logger.log("Attempting to fetch all visitors.");

		// Similar to GetVisitorDetailsUseCase, the repository's findAll method
		// should handle loading of necessary relations if they are expected
		// as part of the summary list of visitors.
		const visitors = await this.visitorRepository.findAll();

		this.logger.log(
			`Successfully fetched ${visitors.length} visitors.`,
			undefined,
			{ count: visitors.length },
		);
		return visitors;
	}
}
