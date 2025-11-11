import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from "typeorm";
import { FormSubmission } from "./form-submission.entity";
import { FormField } from "./form-field.entity";

@Entity({ name: "form_answers" })
export class FormAnswer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // Valor de la respuesta (puede ser string, número, array, etc.)
  @Column({ type: "text", nullable: true })
  value: string;

  // Para valores complejos (arrays, objetos, etc.)
  @Column({ type: "jsonb", nullable: true })
  value_json: any;

  // Relaciones
  @ManyToOne(() => FormSubmission, (submission) => submission.answers, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "form_submission_id" })
  form_submission: FormSubmission;

  @Column()
  form_submission_id: string;

  @ManyToOne(() => FormField, { eager: true })
  @JoinColumn({ name: "form_field_id" })
  form_field: FormField;

  @Column()
  form_field_id: string;

  @CreateDateColumn()
  created_at: Date;
}
