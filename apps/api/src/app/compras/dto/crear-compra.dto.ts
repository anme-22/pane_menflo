import {
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
} from 'class-validator';
import type { CrearCompraRequest } from '@pane/shared';

/** Registrar una compra. `costo` es el TOTAL pagado por la compra. */
export class CrearCompraDto implements CrearCompraRequest {
  @IsInt()
  insumoId!: number;

  @IsInt()
  unidadCompraId!: number;

  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'La cantidad admite hasta 4 decimales.' })
  @IsPositive({ message: 'La cantidad debe ser mayor que 0.' })
  cantidad!: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El costo admite máximo 2 decimales.' })
  @IsPositive({ message: 'El costo debe ser mayor que 0.' })
  costo!: number;

  @IsOptional()
  @IsISO8601()
  fecha?: string;
}
