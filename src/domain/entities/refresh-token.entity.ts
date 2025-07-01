import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Employee } from './employee.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  @Index()
  token: string;

  @Column({ name: 'employee_id' })
  employee_id: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'is_revoked', default: false })
  is_revoked: boolean;

  @Column({ name: 'expires_at' })
  expires_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @Column({ name: 'user_agent', length: 255, nullable: true })
  user_agent: string;

  @Column({ length: 45, nullable: true })
  ip: string;

  @Column({ name: 'device_info', type: 'json', nullable: true })
  device_info: Record<string, any>;
}
