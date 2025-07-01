import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	OneToOne,
	JoinColumn,
} from "typeorm";
import { Employee } from "./employee.entity";

@Entity("employee_credentials")
export class EmployeeCredentials {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ nullable: false })
	password_hash: string;

	@Column({ nullable: true })
	two_factor_secret?: string;

	@Column({ default: false })
	two_factor_enabled: boolean;

	@Column({ type: "jsonb", nullable: true })
	backup_codes?: {
		code: string;
		used: boolean;
		created_at: string;
		used_at?: string;
	}[];

	@Column({ nullable: true })
	sms_otp_code?: string;

	@Column({ nullable: true })
	sms_otp_code_expires_at?: Date;

	@Column({ default: false })
	phone_number_verified: boolean;

	@Column({ default: false })
	is_sms_2fa_enabled: boolean;

	@Column({ nullable: true })
	reset_token?: string;

	@Column({ nullable: true })
	reset_token_expires?: Date;

	@Column({ nullable: true })
	verification_token?: string;

	@Column({ default: false })
	is_email_verified: boolean;

	@OneToOne(
		() => Employee,
		(employee) => employee.credentials,
		{
			onDelete: "CASCADE",
		},
	)
	@JoinColumn()
	employee: Employee;

	@Column()
	employee_id: string;

	@Column({ nullable: true })
	last_login?: Date;

	@Column({ type: "int", default: 0 })
	login_attempts?: number;

	@Column({ nullable: true })
	locked_until?: Date;
}
