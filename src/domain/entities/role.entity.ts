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
import { Permission } from "./permission.entity";

@Entity({ name: "roles" })
export class Role {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column()
	name: string; // e.g., "Admin", "Manager", "Employee", "Security"

	@Column({ type: "text", nullable: true })
	description: string;

	@Column({ default: false })
	is_system_role: boolean; // Si es un rol del sistema (no se puede eliminar)

	@Column({ default: 1 })
	priority: number; // Mayor número = mayor prioridad (para jerarquías)

	// Relación con supplier (multi-tenancy)
	@ManyToOne(() => Supplier, (supplier) => supplier.roles, { nullable: true })
	@JoinColumn({ name: "supplier_id" })
	supplier: Supplier;

	@Column({ nullable: true })
	supplier_id: string;

	// Relación con empleados
	@OneToMany(() => Employee, (employee) => employee.role)
	employees: Employee[];

	// Relación muchos a muchos con permisos
	@ManyToMany(() => Permission, (permission) => permission.roles, { eager: true })
	@JoinTable({
		name: "role_permissions",
		joinColumn: { name: "role_id", referencedColumnName: "id" },
		inverseJoinColumn: { name: "permission_id", referencedColumnName: "id" },
	})
	permissions: Permission[];

	@CreateDateColumn()
	created_at: Date;

	@UpdateDateColumn()
	updated_at: Date;
}
