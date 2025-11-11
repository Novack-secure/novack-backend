import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	CreateDateColumn,
	UpdateDateColumn,
	Unique,
} from "typeorm";
import { Employee } from "./employee.entity";

export enum PreferenceType {
	DASHBOARD_LAYOUT = "dashboard_layout",
	GRAPHS_LAYOUT = "graphs_layout",
	THEME = "theme",
	LANGUAGE = "language",
	NOTIFICATIONS = "notifications",
}

@Entity({ name: "user_preferences" })
@Unique(["employee_id", "preference_type"])
export class UserPreference {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ type: "varchar", length: 50 })
	preference_type: PreferenceType;

	@Column({ type: "jsonb" })
	preference_value: Record<string, any>;

	@ManyToOne(() => Employee, (employee) => employee.preferences)
	employee: Employee;

	@Column()
	employee_id: string;

	@CreateDateColumn()
	created_at: Date;

	@UpdateDateColumn()
	updated_at: Date;
}
