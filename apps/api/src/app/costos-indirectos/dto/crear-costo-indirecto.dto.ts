import { IsIn, IsNumber, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';
import type { CrearCostoIndirectoRequest, TipoCostoIndirecto } from '@pane/shared';

/** Crear un costo indirecto. */
export class CrearCostoIndirectoDto implements CrearCostoIndirectoRequest {
  @IsString()
  @MinLength(2, { message: 'El nombre es muy corto.' })
  @MaxLength(150)
  nombre!: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto admite hasta 2 decimales.' })
  @IsPositive({ message: 'El monto debe ser mayor que 0.' })
  monto!: number;

  @IsIn(['POR_QUINTAL', 'POR_MES'], { message: 'El tipo debe ser POR_QUINTAL o POR_MES.' })
  tipo!: TipoCostoIndirecto;
}
