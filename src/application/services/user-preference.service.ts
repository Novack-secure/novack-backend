import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserPreference, PreferenceType } from "src/domain/entities";
import {
	CreateUserPreferenceDto,
	UpdateUserPreferenceDto,
} from "../dtos/user-preference";

@Injectable()
export class UserPreferenceService {
	constructor(
		@InjectRepository(UserPreference)
		private readonly userPreferenceRepository: Repository<UserPreference>,
	) {}

	async create(
		employeeId: string,
		createDto: CreateUserPreferenceDto,
	): Promise<UserPreference> {
		// Verificar si ya existe una preferencia del mismo tipo
		const existing = await this.userPreferenceRepository.findOne({
			where: {
				employee_id: employeeId,
				preference_type: createDto.preference_type,
			},
		});

		if (existing) {
			// Si existe, actualizar
			existing.preference_value = createDto.preference_value;
			return this.userPreferenceRepository.save(existing);
		}

		// Si no existe, crear nueva
		const preference = this.userPreferenceRepository.create({
			employee_id: employeeId,
			preference_type: createDto.preference_type,
			preference_value: createDto.preference_value,
		});

		return this.userPreferenceRepository.save(preference);
	}

	async findAll(employeeId: string): Promise<UserPreference[]> {
		return this.userPreferenceRepository.find({
			where: { employee_id: employeeId },
		});
	}

	async findOne(
		employeeId: string,
		preferenceType: PreferenceType,
	): Promise<UserPreference | null> {
		return this.userPreferenceRepository.findOne({
			where: {
				employee_id: employeeId,
				preference_type: preferenceType,
			},
		});
	}

	async update(
		employeeId: string,
		preferenceType: PreferenceType,
		updateDto: UpdateUserPreferenceDto,
	): Promise<UserPreference> {
		const preference = await this.findOne(employeeId, preferenceType);

		if (!preference) {
			throw new NotFoundException(
				`Preference ${preferenceType} not found for employee`,
			);
		}

		if (updateDto.preference_value) {
			preference.preference_value = updateDto.preference_value;
		}

		return this.userPreferenceRepository.save(preference);
	}

	async delete(
		employeeId: string,
		preferenceType: PreferenceType,
	): Promise<void> {
		const preference = await this.findOne(employeeId, preferenceType);

		if (!preference) {
			throw new NotFoundException(
				`Preference ${preferenceType} not found for employee`,
			);
		}

		await this.userPreferenceRepository.remove(preference);
	}
}
