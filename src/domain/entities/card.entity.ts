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
} from "typeorm";
import { Supplier } from "./supplier.entity";
import { Visitor } from "./visitor.entity";
import { Employee } from "./employee.entity";
import { CardLocation } from "./card-location.entity";

@Entity({ name: "cards" })
export class Card {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ unique: true })
	card_number: string;

	@Column({ unique: true, nullable: true })
	card_uuid: string;

	@Column({ default: true })
	is_active: boolean;

	@Column({
		type: "enum",
		enum: ["active", "inactive", "lost", "damaged", "assigned", "available"],
		default: "active",
		nullable: true
	})
	status: string;

	@Column({ nullable: true })
	issued_at: Date;

	@Column({ nullable: true })
	expires_at: Date;

	@Column({ type: "numeric", precision: 9, scale: 6, nullable: true })
	latitude: number;

	@Column({ type: "numeric", precision: 9, scale: 6, nullable: true })
	longitude: number;

	@Column({ type: "numeric", precision: 5, scale: 2, nullable: true })
	accuracy: number;

	@Column({ type: "integer", nullable: true, default: 100 })
	battery_percentage: number;

	@Column({ type: "jsonb", nullable: true })
	additional_info: Record<string, any>;

	@CreateDateColumn()
	created_at: Date;

	@UpdateDateColumn()
	updated_at: Date;

	@ManyToOne(
		() => Supplier,
		(supplier) => supplier.cards,
	)
	@JoinColumn({ name: "supplier_id" })
	supplier: Supplier;

	@Column()
	supplier_id: string;

	@OneToOne(
		() => Visitor,
		(visitor) => visitor.card,
	)
	@JoinColumn({ name: "visitor_id" })
	visitor: Visitor;

	@Column({ nullable: true })
	visitor_id: string;

	@ManyToOne(
		() => Employee,
		(employee) => employee.cards,
	)
	@JoinColumn({ name: "employee_id" })
	employee: Employee;

	@Column({ nullable: true })
	employee_id: string;

	@OneToMany(
		() => CardLocation,
		(location) => location.card,
	)
	locations: CardLocation[];
}
