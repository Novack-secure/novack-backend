import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	CreateDateColumn,
	UpdateDateColumn,
	OneToOne,
	OneToMany,
	JoinColumn,
} from "typeorm";
import { Supplier } from "./supplier.entity";
import { Card } from "./card.entity";
import { Appointment } from "./appointment.entity"; // Import Appointment

@Entity({ name: "visitors" })
export class Visitor {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column()
	name: string;

	@Column({ unique: true })
	email: string;

	@Column()
	phone: string;

	@Column()
	location: string;

	@Column({ type: "jsonb", nullable: true })
	additional_info: Record<string, any>;

	@Column({ default: "pendiente" })
	state: string;

	@Column({ nullable: true })
	profile_image_url?: string;

	@CreateDateColumn()
	created_at: Date;

	@UpdateDateColumn()
	updated_at: Date;

	@ManyToOne(
		() => Supplier,
		(supplier) => supplier.visitors,
	)
	supplier: Supplier;

	@Column({ nullable: true })
	supplier_id: string;

	@OneToOne(
		() => Card,
		(card) => card.visitor,
	)
	card: Card;

	@OneToMany(
		() => Appointment,
		(appointment) => appointment.visitor,
	)
	appointments: Appointment[];
}
