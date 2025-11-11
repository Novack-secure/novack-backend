import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from "typeorm";
import { FormTemplate } from "./form-template.entity";

export enum FieldType {
  TEXT = "text",
  EMAIL = "email",
  PHONE = "phone",
  NUMBER = "number",
  TEXTAREA = "textarea",
  SELECT = "select",
  RADIO = "radio",
  CHECKBOX = "checkbox",
  DATE = "date",
  TIME = "time",
  DATETIME = "datetime",
  FILE = "file",
}

@Entity({ name: "form_fields" })
export class FormField {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "enum",
    enum: FieldType,
    default: FieldType.TEXT,
  })
  field_type: FieldType;

  @Column({ type: "varchar", length: 255 })
  label: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  placeholder: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "boolean", default: false })
  is_required: boolean;

  @Column({ type: "integer", default: 0 })
  order: number;

  // Reglas de validación en JSON
  @Column({ type: "jsonb", nullable: true })
  validation_rules: Record<string, any>;

  // Opciones para select, radio, checkbox
  @Column({ type: "jsonb", nullable: true })
  options: string[] | Record<string, any>;

  // Configuración adicional del campo
  @Column({ type: "jsonb", nullable: true })
  settings: Record<string, any>;

  // Relaciones
  @ManyToOne(() => FormTemplate, (template) => template.fields, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "form_template_id" })
  form_template: FormTemplate;

  @Column()
  form_template_id: string;

  @CreateDateColumn()
  created_at: Date;
}
