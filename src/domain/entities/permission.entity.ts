import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToMany,
} from "typeorm";
import { Role } from "./role.entity";

@Entity({ name: "permissions" })
export class Permission {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ unique: true })
	name: string; // e.g., "employees.read", "visitors.create", "reports.export"

	@Column()
	resource: string; // e.g., "employees", "visitors", "appointments"

	@Column()
	action: string; // e.g., "read", "create", "update", "delete", "export"

	@Column({ type: "text", nullable: true })
	description: string;

	@ManyToMany(() => Role, (role) => role.permissions)
	roles: Role[];

	@CreateDateColumn()
	created_at: Date;

	@UpdateDateColumn()
	updated_at: Date;
}
