import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { Supplier } from "./supplier.entity";
import { Employee } from "./employee.entity";
import { FormField } from "./form-field.entity";
import { FormSubmission } from "./form-submission.entity";

@Entity({ name: "form_templates" })
export class FormTemplate {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "varchar", length: 255, unique: true })
  slug: string;

  @Column({ type: "text", nullable: true })
  banner: string;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @Column({ type: "boolean", default: true })
  is_public: boolean;

  @Column({ type: "boolean", default: true })
  requires_approval: boolean;

  @Column({ type: "jsonb", nullable: true })
  notification_emails: string[];

  @Column({ type: "jsonb", nullable: true })
  settings: Record<string, any>;

  // Relaciones
  @ManyToOne(() => Supplier, { eager: false })
  @JoinColumn({ name: "supplier_id" })
  supplier: Supplier;

  @Column()
  supplier_id: string;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: "created_by" })
  created_by_employee: Employee;

  @Column()
  created_by: string;

  @OneToMany(() => FormField, (field) => field.form_template, {
    cascade: true,
  })
  fields: FormField[];

  @OneToMany(() => FormSubmission, (submission) => submission.form_template)
  submissions: FormSubmission[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
