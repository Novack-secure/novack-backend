import { IsEnum, IsString, IsOptional } from 'class-validator';
import { SubmissionStatus } from '../../../domain/entities/form-submission.entity';

export class UpdateSubmissionStatusDto {
  @IsEnum(SubmissionStatus)
  status: SubmissionStatus;

  @IsString()
  @IsOptional()
  admin_notes?: string;
}
