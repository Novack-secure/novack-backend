import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from './employee.entity';
import { Visitor } from './visitor.entity';

@Entity({ name: 'chat_messages' })
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true })
  sender_employee_id: string;

  @Column({ nullable: true })
  sender_visitor_id: string;

  @Column()
  chat_room_id: string;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sender_employee_id' })
  sender_employee?: Employee;

  @ManyToOne(() => Visitor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sender_visitor_id' })
  sender_visitor?: Visitor;

  @ManyToOne('ChatRoom', 'messages', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_room_id' })
  chat_room: any;

  @Column({ default: false })
  is_read: boolean;

  @CreateDateColumn()
  created_at: Date;
}
