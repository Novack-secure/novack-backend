import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { DashboardService } from "src/application/services/dashboard.service";
import { AuthGuard } from "src/application/guards/auth.guard";

@ApiTags("Dashboard")
@Controller("dashboard")
@UseGuards(AuthGuard)
export class DashboardController {
	constructor(private readonly dashboardService: DashboardService) {}

	@Get("stats")
	@ApiOperation({ summary: "Get dashboard statistics" })
	@ApiResponse({ status: 200, description: "Dashboard stats retrieved successfully" })
	async getStats(@Query("supplierId") supplierId?: string) {
		return this.dashboardService.getStats(supplierId);
	}

	@Get("upcoming-appointments")
	@ApiOperation({ summary: "Get upcoming appointments" })
	@ApiResponse({ status: 200, description: "Upcoming appointments retrieved" })
	async getUpcomingAppointments(
		@Query("limit") limit?: number,
		@Query("supplierId") supplierId?: string,
	) {
		return this.dashboardService.getUpcomingAppointments(limit || 5, supplierId);
	}

	@Get("recent-activity")
	@ApiOperation({ summary: "Get recent visitor activity" })
	@ApiResponse({ status: 200, description: "Recent activity retrieved" })
	async getRecentActivity(
		@Query("limit") limit?: number,
		@Query("supplierId") supplierId?: string,
	) {
		return this.dashboardService.getRecentActivity(limit || 10, supplierId);
	}

	@Get("weekly-stats")
	@ApiOperation({ summary: "Get weekly statistics" })
	@ApiResponse({ status: 200, description: "Weekly statistics retrieved successfully" })
	async getWeeklyStats(@Query("supplierId") supplierId?: string) {
		return this.dashboardService.getWeeklyStats(supplierId);
	}

	@Get("card-stats")
	@ApiOperation({ summary: "Get card statistics" })
	@ApiResponse({ status: 200, description: "Card statistics retrieved successfully" })
	async getCardStats(@Query("supplierId") supplierId?: string) {
		return this.dashboardService.getCardStats(supplierId);
	}

	@Get("visitor-trends")
	@ApiOperation({ summary: "Get visitor trends over time" })
	@ApiResponse({ status: 200, description: "Visitor trends retrieved successfully" })
	async getVisitorTrends(
		@Query("days") days?: number,
		@Query("supplierId") supplierId?: string,
	) {
		return this.dashboardService.getVisitorTrends(days || 7, supplierId);
	}

	@Get("appointment-status")
	@ApiOperation({ summary: "Get appointment status breakdown" })
	@ApiResponse({ status: 200, description: "Appointment status breakdown retrieved successfully" })
	async getAppointmentStatusBreakdown(@Query("supplierId") supplierId?: string) {
		return this.dashboardService.getAppointmentStatusBreakdown(supplierId);
	}

	@Get("monthly-trends")
	@ApiOperation({ summary: "Get monthly trends" })
	@ApiResponse({ status: 200, description: "Monthly trends retrieved successfully" })
	async getMonthlyTrends(
		@Query("months") months?: number,
		@Query("supplierId") supplierId?: string,
	) {
		return this.dashboardService.getMonthlyTrends(months || 6, supplierId);
	}

	@Get("hourly-activity")
	@ApiOperation({ summary: "Get hourly activity for today" })
	@ApiResponse({ status: 200, description: "Hourly activity retrieved successfully" })
	async getHourlyActivity(@Query("supplierId") supplierId?: string) {
		return this.dashboardService.getHourlyActivity(supplierId);
	}
}
