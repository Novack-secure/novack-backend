import { IsString, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateAppointmentFromSubmissionDto {
  @IsDateString()
  scheduled_time: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsUUID()
  @IsOptional()
  host_employee_id?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
