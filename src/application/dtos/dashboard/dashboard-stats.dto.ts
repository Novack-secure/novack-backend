export class DashboardStatsDto {
	totalEmployees: number;
	activeVisitorsToday: number;
	pendingAppointments: number;
	unreadMessages: number;
	availableCards: number;
	activeChatRooms: number;
	completedAppointmentsToday: number;
}

export class RecentActivityDto {
	id: string;
	visitorName: string;
	action: string;
	time: Date;
	location?: string;
}

export class UpcomingAppointmentDto {
	id: string;
	visitorName: string;
	purpose: string;
	scheduledTime: Date;
	status: string;
	location?: string;
	hostEmployee?: {
		id: string;
		first_name: string;
		last_name: string;
	};
}

export class WeeklyStatsDto {
	day: string;
	visitors: number;
	appointments: number;
	completedVisits: number;
}

export class CardStatsDto {
	total: number;
	active: number;
	inactive: number;
	assigned: number;
	available: number;
	averageBattery: number;
	lowBattery: number;
	criticalBattery: number;
}

export class VisitorTrendDto {
	date: string;
	checkIns: number;
	checkOuts: number;
	activeVisitors: number;
}

export class EmployeeActivityDto {
	employeeId: string;
	employeeName: string;
	department: string;
	appointmentsHosted: number;
	messagesCount: number;
	lastActivity: Date | null;
}

export class AppointmentStatusDto {
	status: string;
	count: number;
	percentage: number;
}

export class MonthlyTrendDto {
	month: string;
	visitors: number;
	appointments: number;
	completedAppointments: number;
}

export class HourlyActivityDto {
	hour: number;
	visitors: number;
	appointments: number;
}
