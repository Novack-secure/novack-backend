import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, MoreThanOrEqual } from "typeorm";
import {
	Employee,
	Visitor,
	Appointment,
	Card,
	ChatRoom,
	ChatMessage,
} from "src/domain/entities";
import {
	DashboardStatsDto,
	RecentActivityDto,
	UpcomingAppointmentDto,
	WeeklyStatsDto,
	CardStatsDto,
	VisitorTrendDto,
	AppointmentStatusDto,
	MonthlyTrendDto,
	HourlyActivityDto,
} from "../dtos/dashboard/dashboard-stats.dto";

@Injectable()
export class DashboardService {
	constructor(
		@InjectRepository(Employee)
		private readonly employeeRepository: Repository<Employee>,
		@InjectRepository(Visitor)
		private readonly visitorRepository: Repository<Visitor>,
		@InjectRepository(Appointment)
		private readonly appointmentRepository: Repository<Appointment>,
		@InjectRepository(Card)
		private readonly cardRepository: Repository<Card>,
		@InjectRepository(ChatRoom)
		private readonly chatRoomRepository: Repository<ChatRoom>,
		@InjectRepository(ChatMessage)
		private readonly chatMessageRepository: Repository<ChatMessage>,
	) {}

	async getStats(supplierId?: string): Promise<DashboardStatsDto> {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		// Build query conditions
		const visitorWhere = supplierId ? { supplier_id: supplierId } : {};
		const appointmentWhere = supplierId ? { supplier_id: supplierId } : {};
		const employeeWhere = supplierId ? { supplier_id: supplierId } : {};

		// Total employees
		const totalEmployees = await this.employeeRepository.count({
			where: employeeWhere,
		});

		// Active visitors today (checked in but not checked out)
		const activeVisitorsToday = await this.appointmentRepository.count({
			where: {
				...appointmentWhere,
				check_in_time: Between(today, tomorrow),
				status: "en_progreso",
			},
		});

		// Pending appointments (scheduled for future)
		const pendingAppointments = await this.appointmentRepository.count({
			where: {
				...appointmentWhere,
				status: "pendiente",
				scheduled_time: MoreThanOrEqual(new Date()),
			},
		});

		// Unread messages (simplified - would need user context)
		const unreadMessages = await this.chatMessageRepository.count({
			where: {
				is_read: false,
			},
		});

		// Available cards (is_active and not assigned to any visitor)
		const availableCards = await this.cardRepository
			.createQueryBuilder("card")
			.where("card.is_active = :isActive", { isActive: true })
			.andWhere("card.visitor_id IS NULL")
			.getCount();

		// Active chat rooms
		const activeChatRooms = await this.chatRoomRepository.count({
			where: supplierId
				? {
						supplier_id: supplierId,
						is_active: true,
				  }
				: { is_active: true },
		});

		// Completed appointments today
		const completedAppointmentsToday = await this.appointmentRepository.count({
			where: {
				...appointmentWhere,
				check_out_time: Between(today, tomorrow),
				status: "completado",
			},
		});

		return {
			totalEmployees,
			activeVisitorsToday,
			pendingAppointments,
			unreadMessages,
			availableCards,
			activeChatRooms,
			completedAppointmentsToday,
		};
	}

	async getUpcomingAppointments(
		limit: number = 5,
		supplierId?: string,
	): Promise<UpcomingAppointmentDto[]> {
		const where = supplierId
			? {
					supplier_id: supplierId,
					status: "pendiente",
					scheduled_time: MoreThanOrEqual(new Date()),
			  }
			: {
					status: "pendiente",
					scheduled_time: MoreThanOrEqual(new Date()),
			  };

		const appointments = await this.appointmentRepository.find({
			where,
			relations: ["visitor", "host_employee"],
			order: { scheduled_time: "ASC" },
			take: limit,
		});

		return appointments.map((apt) => ({
			id: apt.id,
			visitorName: apt.visitor?.name || "Unknown",
			purpose: apt.title || "No especificado",
			scheduledTime: apt.scheduled_time,
			status: apt.status,
			location: apt.location,
			hostEmployee: apt.host_employee
				? {
						id: apt.host_employee.id,
						first_name: apt.host_employee.first_name,
						last_name: apt.host_employee.last_name,
				  }
				: undefined,
		}));
	}

	async getRecentActivity(
		limit: number = 10,
		supplierId?: string,
	): Promise<RecentActivityDto[]> {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const where = supplierId
			? {
					supplier_id: supplierId,
					check_in_time: MoreThanOrEqual(today),
			  }
			: {
					check_in_time: MoreThanOrEqual(today),
			  };

		const appointments = await this.appointmentRepository.find({
			where,
			relations: ["visitor"],
			order: { check_in_time: "DESC" },
			take: limit,
		});

		return appointments.map((apt) => ({
			id: apt.id,
			visitorName: apt.visitor?.name || "Unknown",
			action: apt.status === "en_progreso" ? "Ingresó" : "Completó visita",
			time: apt.check_in_time,
			location: apt.location,
		}));
	}

	async getWeeklyStats(supplierId?: string): Promise<WeeklyStatsDto[]> {
		const today = new Date();
		const sevenDaysAgo = new Date(today);
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		const where = supplierId ? { supplier_id: supplierId } : {};

		const weeklyData: WeeklyStatsDto[] = [];

		for (let i = 6; i >= 0; i--) {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			const dayStart = new Date(date.setHours(0, 0, 0, 0));
			const dayEnd = new Date(date.setHours(23, 59, 59, 999));

			const dayName = dayStart.toLocaleDateString('es-ES', { weekday: 'short' });

			const visitors = await this.appointmentRepository.count({
				where: {
					...where,
					check_in_time: Between(dayStart, dayEnd),
				},
			});

			const appointments = await this.appointmentRepository.count({
				where: {
					...where,
					scheduled_time: Between(dayStart, dayEnd),
				},
			});

			const completedVisits = await this.appointmentRepository.count({
				where: {
					...where,
					status: "completado",
					check_out_time: Between(dayStart, dayEnd),
				},
			});

			weeklyData.push({
				day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
				visitors,
				appointments,
				completedVisits,
			});
		}

		return weeklyData;
	}

	async getCardStats(supplierId?: string): Promise<CardStatsDto> {
		const where = supplierId ? { supplier_id: supplierId } : {};

		const total = await this.cardRepository.count({ where });

		const active = await this.cardRepository.count({
			where: { ...where, is_active: true }
		});

		const inactive = await this.cardRepository.count({
			where: { ...where, is_active: false }
		});

		const assigned = await this.cardRepository
			.createQueryBuilder("card")
			.where(supplierId ? "card.supplier_id = :supplierId" : "1=1", { supplierId })
			.andWhere("card.visitor_id IS NOT NULL")
			.getCount();

		const available = await this.cardRepository
			.createQueryBuilder("card")
			.where(supplierId ? "card.supplier_id = :supplierId" : "1=1", { supplierId })
			.andWhere("card.is_active = :isActive", { isActive: true })
			.andWhere("card.visitor_id IS NULL")
			.getCount();

		const cardsWithBattery = await this.cardRepository
			.createQueryBuilder("card")
			.where(supplierId ? "card.supplier_id = :supplierId" : "1=1", { supplierId })
			.andWhere("card.battery_percentage IS NOT NULL")
			.getMany();

		const averageBattery = cardsWithBattery.length > 0
			? cardsWithBattery.reduce((sum, card) => sum + (card.battery_percentage || 0), 0) / cardsWithBattery.length
			: 0;

		const lowBattery = cardsWithBattery.filter(
			card => card.battery_percentage && card.battery_percentage < 30 && card.battery_percentage >= 10
		).length;

		const criticalBattery = cardsWithBattery.filter(
			card => card.battery_percentage && card.battery_percentage < 10
		).length;

		return {
			total,
			active,
			inactive,
			assigned,
			available,
			averageBattery: Math.round(averageBattery),
			lowBattery,
			criticalBattery,
		};
	}

	async getVisitorTrends(days: number = 7, supplierId?: string): Promise<VisitorTrendDto[]> {
		const today = new Date();
		const trends: VisitorTrendDto[] = [];

		for (let i = days - 1; i >= 0; i--) {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			const dayStart = new Date(date.setHours(0, 0, 0, 0));
			const dayEnd = new Date(date.setHours(23, 59, 59, 999));

			const where = supplierId ? { supplier_id: supplierId } : {};

			const checkIns = await this.appointmentRepository.count({
				where: {
					...where,
					check_in_time: Between(dayStart, dayEnd),
				},
			});

			const checkOuts = await this.appointmentRepository.count({
				where: {
					...where,
					check_out_time: Between(dayStart, dayEnd),
				},
			});

			const activeVisitors = await this.appointmentRepository.count({
				where: {
					...where,
					status: "en_progreso",
					check_in_time: Between(dayStart, dayEnd),
				},
			});

			trends.push({
				date: dayStart.toISOString().split('T')[0],
				checkIns,
				checkOuts,
				activeVisitors,
			});
		}

		return trends;
	}

	async getAppointmentStatusBreakdown(supplierId?: string): Promise<AppointmentStatusDto[]> {
		const where = supplierId ? { supplier_id: supplierId } : {};

		const total = await this.appointmentRepository.count({ where });

		const statuses = ['pendiente', 'en_progreso', 'completado', 'cancelado'];
		const breakdown: AppointmentStatusDto[] = [];

		for (const status of statuses) {
			const count = await this.appointmentRepository.count({
				where: { ...where, status }
			});

			breakdown.push({
				status,
				count,
				percentage: total > 0 ? Math.round((count / total) * 100) : 0
			});
		}

		return breakdown;
	}

	async getMonthlyTrends(months: number = 6, supplierId?: string): Promise<MonthlyTrendDto[]> {
		const trends: MonthlyTrendDto[] = [];
		const where = supplierId ? { supplier_id: supplierId } : {};

		for (let i = months - 1; i >= 0; i--) {
			const date = new Date();
			date.setMonth(date.getMonth() - i);
			const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
			const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

			const monthName = monthStart.toLocaleDateString('es-ES', { month: 'short' });

			const visitors = await this.visitorRepository.count({
				where: {
					...where,
					created_at: Between(monthStart, monthEnd),
				},
			});

			const appointments = await this.appointmentRepository.count({
				where: {
					...where,
					scheduled_time: Between(monthStart, monthEnd),
				},
			});

			const completedAppointments = await this.appointmentRepository.count({
				where: {
					...where,
					status: 'completado',
					check_out_time: Between(monthStart, monthEnd),
				},
			});

			trends.push({
				month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
				visitors,
				appointments,
				completedAppointments,
			});
		}

		return trends;
	}

	async getHourlyActivity(supplierId?: string): Promise<HourlyActivityDto[]> {
		const today = new Date();
		const todayStart = new Date(today.setHours(0, 0, 0, 0));
		const todayEnd = new Date(today.setHours(23, 59, 59, 999));
		const where = supplierId ? { supplier_id: supplierId } : {};

		const hourlyData: HourlyActivityDto[] = [];

		for (let hour = 0; hour < 24; hour++) {
			const hourStart = new Date(todayStart);
			hourStart.setHours(hour, 0, 0, 0);
			const hourEnd = new Date(todayStart);
			hourEnd.setHours(hour, 59, 59, 999);

			const visitors = await this.appointmentRepository.count({
				where: {
					...where,
					check_in_time: Between(hourStart, hourEnd),
				},
			});

			const appointments = await this.appointmentRepository.count({
				where: {
					...where,
					scheduled_time: Between(hourStart, hourEnd),
				},
			});

			if (visitors > 0 || appointments > 0) {
				hourlyData.push({
					hour,
					visitors,
					appointments,
				});
			}
		}

		return hourlyData;
	}
}
