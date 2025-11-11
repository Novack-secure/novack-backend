import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested, IsEmail, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FieldType } from '../../../domain/entities/form-field.entity';

export class CreateFormFieldDto {
  @IsEnum(FieldType)
  field_type: FieldType;

  @IsString()
  label: string;

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsString()
  @IsOptional()
  help_text?: string;

  @IsBoolean()
  is_required: boolean;

  @IsNumber()
  @Min(0)
  order: number;

  @IsOptional()
  validation_rules?: Record<string, any>;

  @IsOptional()
  options?: string[] | Record<string, any>;

  @IsOptional()
  settings?: Record<string, any>;
}

export class CreateFormTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  banner?: string;

  @IsBoolean()
  @IsOptional()
  is_public?: boolean;

  @IsBoolean()
  @IsOptional()
  requires_approval?: boolean;

  @IsArray()
  @IsEmail({}, { each: true })
  @IsOptional()
  notification_emails?: string[];

  @IsOptional()
  settings?: Record<string, any>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFormFieldDto)
  fields: CreateFormFieldDto[];
}
