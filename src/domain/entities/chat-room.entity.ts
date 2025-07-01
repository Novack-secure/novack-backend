import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	OneToMany,
	ManyToMany,
	JoinTable,
} from "typeorm";
import { Supplier } from "./supplier.entity";
import { Employee } from "./employee.entity";
import { Visitor } from "./visitor.entity";

export enum ChatRoomType {
	SUPPLIER_GROUP = "supplier_group", // Grupo general del proveedor
	EMPLOYEE_TO_EMPLOYEE = "employee_to_employee", // Chat privado entre empleados
	EMPLOYEE_TO_VISITOR = "employee_to_visitor", // Chat entre empleado y visitante
	PRIVATE = "private", // Chat privado (general)
}

@Entity({ name: "chat_rooms" })
export class ChatRoom {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column()
	name: string;

	@Column({
		type: "enum",
		enum: ChatRoomType,
		default: ChatRoomType.EMPLOYEE_TO_EMPLOYEE,
	})
	type: ChatRoomType;

	@Column({ nullable: true })
	supplier_id: string;

	@ManyToOne(() => Supplier, { nullable: true, onDelete: "CASCADE" })
	@JoinColumn({ name: "supplier_id" })
	supplier?: Supplier;

	@ManyToMany(() => Employee)
	@JoinTable({
		name: "chat_room_employees",
		joinColumn: { name: "chat_room_id", referencedColumnName: "id" },
		inverseJoinColumn: { name: "employee_id", referencedColumnName: "id" },
	})
	employees: Employee[];

	@ManyToMany(() => Visitor)
	@JoinTable({
		name: "chat_room_visitors",
		joinColumn: { name: "chat_room_id", referencedColumnName: "id" },
		inverseJoinColumn: { name: "visitor_id", referencedColumnName: "id" },
	})
	visitors: Visitor[];

	@OneToMany("ChatMessage", "chat_room")
	messages: any[];

	@Column({ default: true })
	is_active: boolean;

	@CreateDateColumn()
	created_at: Date;

	@UpdateDateColumn()
	updated_at: Date;
}
