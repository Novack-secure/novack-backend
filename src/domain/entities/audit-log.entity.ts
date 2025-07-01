import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  user_id: string;

  @Column({ name: 'user_email', nullable: true })
  user_email?: string;

  @Column()
  @Index()
  action: string;

  @Column({ name: 'resource_type' })
  @Index()
  resource_type: string;

  @Column({ name: 'resource_id' })
  @Index()
  resource_id: string;

  @Column({ name: 'ip_address' })
  ip_address: string;

  @Column({ name: 'user_agent', length: 500, nullable: true })
  user_agent?: string;

  @Column({ name: 'additional_data', type: 'text', nullable: true })
  additional_data: string;

  @CreateDateColumn({ name: 'timestamp' })
  @Index()
  timestamp: Date;
}
