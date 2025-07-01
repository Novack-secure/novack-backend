import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCardDto {
  @ApiProperty({
    description: 'ID del proveedor al que pertenece la tarjeta',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  supplier_id: string;

  @ApiProperty({
    description: 'Número único de la tarjeta',
    example: 'CARD-001',
    required: false,
  })
  @IsString()
  @IsOptional()
  card_number?: string;

  @ApiProperty({
    description: 'Indica si la tarjeta está activa',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiProperty({
    description: 'Fecha de expiración de la tarjeta',
    example: '2025-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  expires_at?: Date;
}
