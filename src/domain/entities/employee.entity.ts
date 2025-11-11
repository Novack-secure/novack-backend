import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	CreateDateColumn,
	UpdateDateColumn,
	OneToOne,
	JoinColumn,
	OneToMany,
	ManyToMany,
	JoinTable,
} from "typeorm";
import { Supplier } from "./supplier.entity";
import { ChatRoom } from "./chat-room.entity";
import { EmployeeCredentials } from "./employee-credentials.entity";
import { Appointment } from "./appointment.entity";
import { UserPreference } from "./user-preference.entity";
import { Role } from "./role.entity";
import { Card } from "./card.entity";

@Entity({ name: "employees" })
export class Employee {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column()
	first_name: string;

	@Column()
	last_name: string;

	@Column({ unique: true })
	email: string;

	@Column({ nullable: true })
	phone?: string;

	@Column({ nullable: true })
	position?: string;

	@Column({ nullable: true })
	department?: string;

	@Column({ nullable: true })
	profile_image_url?: string;

	@Column({ default: false })
	is_creator: boolean;

	@Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
	created_at: Date;

	@Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
	updated_at: Date;

	@ManyToOne(
		() => Supplier,
		(supplier) => supplier.employees,
		{ nullable: true }
	)
	@JoinColumn({ name: "supplier_id" })
	supplier: Supplier;

	@Column({ nullable: true })
	supplier_id: string;

	// Relación con rol
	@ManyToOne(() => Role, (role) => role.employees, { nullable: true, eager: true })
	@JoinColumn({ name: "role_id" })
	role: Role;

	@Column({ nullable: true })
	role_id: string;

	@ManyToMany(() => ChatRoom)
	@JoinTable({
		name: "chat_room_employees",
		joinColumn: { name: "employee_id", referencedColumnName: "id" },
		inverseJoinColumn: { name: "chat_room_id", referencedColumnName: "id" },
	})
	chat_rooms: ChatRoom[];

	@OneToOne(
		() => EmployeeCredentials,
		(credentials) => credentials.employee,
	)
	credentials: EmployeeCredentials;

	@OneToMany(
		() => Appointment,
		(appointment) => appointment.host_employee,
	)
	hosted_appointments: Appointment[];

	@OneToMany(
		() => UserPreference,
		(preference) => preference.employee,
	)
	preferences: UserPreference[];

	@OneToMany(
		() => Card,
		(card) => card.employee,
	)
	cards: Card[];
}
