import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Supplier } from './supplier.entity';
import { Visitor } from './visitor.entity';
import { Employee } from './employee.entity';

@Entity({ name: 'cards' })
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  card_number: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  issued_at: Date;

  @Column({ nullable: true })
  expires_at: Date;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  longitude: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  accuracy: number;

  @Column({ type: 'jsonb', nullable: true })
  additional_info: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Supplier, (supplier) => supplier.cards)
  supplier: Supplier;

  @Column()
  supplier_id: string;

  @ManyToOne(() => Employee, (employee) => employee.cards)
  assigned_to: Employee;

  @Column({ nullable: true })
  assigned_to_id: string;

  @OneToOne(() => Visitor, (visitor) => visitor.card)
  @JoinColumn()
  visitor: Visitor;

  @OneToMany(() => CardLocation, (location) => location.card)
  locations: CardLocation[];
}

@Entity({ name: 'card_locations' })
export class CardLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'numeric', precision: 9, scale: 6 })
  latitude: number;

  @Column({ type: 'numeric', precision: 9, scale: 6 })
  longitude: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  accuracy: number;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Card, (card) => card.locations)
  card: Card;

  @Column()
  card_id: string;
}
