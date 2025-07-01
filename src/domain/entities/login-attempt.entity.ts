import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

/**
 * Entidad para almacenar los intentos de inicio de sesión
 * y prevenir ataques de fuerza bruta
 */
@Entity('login_attempts')
export class LoginAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  ip_address: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: false })
  user_agent: string;

  @Column({ default: false })
  success: boolean;

  @Column({ default: false })
  blocked: boolean;

  @CreateDateColumn()
  created_at: Date;
}
