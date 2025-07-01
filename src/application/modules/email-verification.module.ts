import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../../domain/entities';
import { EmployeeCredentials } from '../../domain/entities/employee-credentials.entity';
import { EmailVerificationService } from '../services/email-verification.service';
import { EmailVerificationController } from '../../interface/controllers/email-verification.controller';
import { EmailModule } from './email.module';
import { JwtConfigModule } from './jwt.module';
import { AuthModule } from './auth.module';
import { EmployeeRepository } from '../../infrastructure/repositories/employee.repository';
import { TokenModule } from './token.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, EmployeeCredentials]),
    EmailModule,
    JwtConfigModule,
    forwardRef(() => AuthModule),
    TokenModule,
  ],
  controllers: [EmailVerificationController],
  providers: [
    EmailVerificationService,
    EmployeeRepository,
    {
      provide: 'IEmployeeRepository',
      useClass: EmployeeRepository,
    },
  ],
  exports: [EmailVerificationService],
})
export class EmailVerificationModule {}
