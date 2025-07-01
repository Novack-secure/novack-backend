import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';

@Entity({ name: 'supplier_subscriptions' })
export class SupplierSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: false })
  is_subscribed: boolean;

  @Column({ default: false })
  has_card_subscription: boolean;

  @Column({ default: false })
  has_sensor_subscription: boolean;

  @Column({ default: 0 })
  max_employee_count: number;

  @Column({ default: 0 })
  max_card_count: number;

  @Column({ type: 'timestamp', nullable: true })
  subscription_start_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  subscription_end_date: Date;

  @Column({ type: 'jsonb', nullable: true })
  subscription_details: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  supplier_id: string;

  // Relación con Supplier
  @OneToOne(() => Supplier, (supplier) => supplier.subscription)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;
}
