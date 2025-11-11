import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  FormTemplate,
  FormField,
  FormSubmission,
  FormAnswer,
  Appointment,
  Visitor,
  Employee,
} from '../../domain/entities';
import { FormTemplateService } from '../services/form-template.service';
import { FormSubmissionService } from '../services/form-submission.service';
import { FormTemplateController } from '../../interface/controllers/form-template.controller';
import { FormSubmissionController } from '../../interface/controllers/form-submission.controller';
import { TokenModule } from './token.module';
import { AuthGuard } from '../guards/auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormTemplate,
      FormField,
      FormSubmission,
      FormAnswer,
      Appointment,
      Visitor,
      Employee,
    ]),
    TokenModule,
  ],
  controllers: [FormTemplateController, FormSubmissionController],
  providers: [FormTemplateService, FormSubmissionService, AuthGuard],
  exports: [FormTemplateService, FormSubmissionService],
})
export class FormModule {}
