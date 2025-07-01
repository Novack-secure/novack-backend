import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToMany,
	OneToOne,
} from "typeorm";
import { Employee } from "./employee.entity";
import { Visitor } from "./visitor.entity";
import { Card } from "./card.entity";
import { SupplierSubscription } from "./supplier-subscription.entity";
import { Appointment } from "./appointment.entity"; // Import Appointment

@Entity({ name: "suppliers" })
export class Supplier {
	@PrimaryGeneratedColumn("uuid")
	id: string; //no  ol

	@Column()
	supplier_name: string;

	@Column({ nullable: true })
	supplier_creator: string; //no

	@Column({ unique: true })
	contact_email: string;

	@Column()
	phone_number: string;

	@Column()
	address: string;

	@Column()
	description: string;

	@Column({ nullable: true })
	logo_url: string;

	@Column({ nullable: true })
	profile_image_url?: string;

	@Column({ type: "jsonb", nullable: true })
	additional_info: Record<string, any>;

	@CreateDateColumn()
	created_at: Date; //no

	@UpdateDateColumn()
	updated_at: Date; //no

	// Relaciones
	@OneToMany(
		() => Employee,
		(employee) => employee.supplier,
	)
	employees: Employee[];

	@OneToMany(
		() => Visitor,
		(visitor) => visitor.supplier,
	)
	visitors: Visitor[];

	@OneToMany(
		() => Card,
		(card) => card.supplier,
	)
	cards: Card[];

	@OneToMany(
		() => Appointment,
		(appointment) => appointment.supplier,
	)
	appointments: Appointment[];

	// Relación con SupplierSubscription
	@OneToOne(
		() => SupplierSubscription,
		(subscription) => subscription.supplier,
	)
	subscription: SupplierSubscription;
}
