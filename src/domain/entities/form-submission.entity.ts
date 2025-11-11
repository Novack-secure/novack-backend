import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { FormTemplate } from "./form-template.entity";
import { FormAnswer } from "./form-answer.entity";
import { Appointment } from "./appointment.entity";
import { Employee } from "./employee.entity";
import { Supplier } from "./supplier.entity";

export enum SubmissionStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

@Entity({ name: "form_submissions" })
export class FormSubmission {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // Datos básicos del visitante
  @Column({ type: "varchar", length: 255 })
  visitor_name: string;

  @Column({ type: "varchar", length: 255 })
  visitor_email: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  visitor_phone: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  visitor_company: string;

  @Column({
    type: "enum",
    enum: SubmissionStatus,
    default: SubmissionStatus.PENDING,
  })
  status: SubmissionStatus;

  @Column({ type: "text", nullable: true })
  admin_notes: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  // Relaciones
  @ManyToOne(() => FormTemplate, (template) => template.submissions)
  @JoinColumn({ name: "form_template_id" })
  form_template: FormTemplate;

  @Column()
  form_template_id: string;

  @ManyToOne(() => Supplier, { eager: false })
  @JoinColumn({ name: "supplier_id" })
  supplier: Supplier;

  @Column()
  supplier_id: string;

  @OneToMany(() => FormAnswer, (answer) => answer.form_submission, {
    cascade: true,
    eager: true,
  })
  answers: FormAnswer[];

  @OneToOne(() => Appointment, (appointment) => appointment.form_submission, {
    nullable: true,
  })
  appointment: Appointment;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: "approved_by" })
  approved_by_employee: Employee;

  @Column({ nullable: true })
  approved_by: string;

  @Column({ type: "timestamp", nullable: true })
  approved_at: Date;

  @CreateDateColumn()
  submitted_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
