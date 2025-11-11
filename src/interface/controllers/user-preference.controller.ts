import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Body,
	Param,
	UseGuards,
	Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { UserPreferenceService } from "src/application/services/user-preference.service";
import {
	CreateUserPreferenceDto,
	UpdateUserPreferenceDto,
} from "src/application/dtos/user-preference";
import { AuthGuard } from "src/application/guards/auth.guard";
import { PreferenceType } from "src/domain/entities";

@ApiTags("User Preferences")
@Controller("user-preferences")
@UseGuards(AuthGuard)
export class UserPreferenceController {
	constructor(
		private readonly userPreferenceService: UserPreferenceService,
	) {}

	@Post()
	@ApiOperation({ summary: "Create or update a user preference" })
	@ApiResponse({ status: 201, description: "Preference created/updated successfully" })
	async create(@Request() req: any, @Body() createDto: CreateUserPreferenceDto) {
		return this.userPreferenceService.create(req.user.sub, createDto);
	}

	@Get()
	@ApiOperation({ summary: "Get all preferences for current user" })
	@ApiResponse({ status: 200, description: "Preferences retrieved successfully" })
	async findAll(@Request() req: any) {
		return this.userPreferenceService.findAll(req.user.sub);
	}

	@Get(":type")
	@ApiOperation({ summary: "Get a specific preference by type" })
	@ApiResponse({ status: 200, description: "Preference retrieved successfully" })
	async findOne(@Request() req: any, @Param("type") type: PreferenceType) {
		return this.userPreferenceService.findOne(req.user.sub, type);
	}

	@Put(":type")
	@ApiOperation({ summary: "Update a specific preference" })
	@ApiResponse({ status: 200, description: "Preference updated successfully" })
	async update(
		@Request() req: any,
		@Param("type") type: PreferenceType,
		@Body() updateDto: UpdateUserPreferenceDto,
	) {
		return this.userPreferenceService.update(req.user.sub, type, updateDto);
	}

	@Delete(":type")
	@ApiOperation({ summary: "Delete a specific preference" })
	@ApiResponse({ status: 200, description: "Preference deleted successfully" })
	async delete(@Request() req: any, @Param("type") type: PreferenceType) {
		await this.userPreferenceService.delete(req.user.sub, type);
		return { message: "Preference deleted successfully" };
	}
}
