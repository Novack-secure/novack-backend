import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
} from "typeorm";
import { Visitor } from "./visitor.entity";
import { Supplier } from "./supplier.entity";

@Entity("appointments")
export class Appointment {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ nullable: true })
	title?: string;

	@Column({ type: "text", nullable: true })
	description?: string;

	@Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
	scheduled_time: Date;

	@Column({ type: "timestamp", nullable: true })
	check_in_time?: Date | null;

	@Column({ type: "timestamp", nullable: true })
	check_out_time?: Date | null;

	@Column({ type: "jsonb", nullable: true })
	complaints?: Record<string, any>;

	@Column({ default: "pendiente" }) // e.g., pendiente, en_progreso, completado, cancelado
	status: string;

	@ManyToOne(
		() => Visitor,
		(visitor) => visitor.appointments,
		{
			onDelete: "CASCADE",
		},
	)
	@JoinColumn({ name: "visitor_id" })
	visitor: Visitor;

	@Column()
	visitor_id: string;

	@ManyToOne(
		() => Supplier,
		(supplier) => supplier.appointments,
		{
			onDelete: "SET NULL",
			nullable: true,
		},
	)
	@JoinColumn({ name: "supplier_id" })
	supplier?: Supplier | null;

	@Column({ nullable: true })
	supplier_id?: string | null;

	@Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
	created_at: Date;

	@Column({
		type: "timestamp",
		default: () => "CURRENT_TIMESTAMP",
		onUpdate: "CURRENT_TIMESTAMP",
	})
	updated_at: Date;
}
