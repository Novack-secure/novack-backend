import { IsString, IsEmail, IsOptional, IsArray, ValidateNested, IsPhoneNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class FormAnswerDto {
  @IsString()
  field_id: string;

  @IsOptional()
  value?: any;
}

export class SubmitFormDto {
  @IsString()
  visitor_name: string;

  @IsEmail()
  visitor_email: string;

  @IsString()
  @IsOptional()
  visitor_phone?: string;

  @IsString()
  @IsOptional()
  visitor_company?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormAnswerDto)
  answers: FormAnswerDto[];

  @IsOptional()
  metadata?: Record<string, any>;
}
