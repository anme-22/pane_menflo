import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { ActualizarCostoIndirectoRequest, TipoCostoIndirecto } from '@pane/shared';

/** Actualizar un costo indirecto. */
export class ActualizarCostoIndirectoDto implements ActualizarCostoIndirectoRequest {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre es muy corto.' })
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto admite hasta 2 decimales.' })
  @IsPositive({ message: 'El monto debe ser mayor que 0.' })
  monto?: number;

  @IsOptional()
  @IsIn(['POR_QUINTAL', 'POR_MES'], { message: 'El tipo debe ser POR_QUINTAL o POR_MES.' })
  tipo?: TipoCostoIndirecto;
}
