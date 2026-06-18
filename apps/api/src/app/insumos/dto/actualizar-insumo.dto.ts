import {
  IsNumber,
  IsOptional,
  Min,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { ActualizarInsumoRequest } from '@pane/shared';

/** Actualizar insumo: nombre y/o umbral de stock (el tipo no cambia). */
export class ActualizarInsumoDto implements ActualizarInsumoRequest {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre es muy corto.' })
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'El stock mínimo admite hasta 4 decimales.' })
  @Min(0, { message: 'El stock mínimo no puede ser negativo.' })
  stockMinimo?: number;
}
