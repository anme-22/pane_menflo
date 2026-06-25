import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import type { LineaFacturaInput } from '@pane/shared';

/** Una línea de la factura (el precio/nombre se snapshotan en el servidor). */
export class LineaFacturaDto implements LineaFacturaInput {
  @IsInt()
  productoId!: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'La cantidad admite hasta 2 decimales.' })
  @IsPositive({ message: 'La cantidad debe ser mayor que 0.' })
  cantidad!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'La tasa admite hasta 4 decimales.' })
  @Min(0, { message: 'La tasa no puede ser negativa.' })
  @Max(1, { message: 'La tasa va de 0 a 1 (ej. 0.15 = 15%).' })
  tasaImpuesto?: number;

  @IsOptional()
  @IsBoolean()
  esCortesia?: boolean;
}
