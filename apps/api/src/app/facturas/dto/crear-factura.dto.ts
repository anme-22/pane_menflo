import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  Matches,
  ValidateNested,
} from 'class-validator';
import type { CrearFacturaRequest, TipoPago } from '@pane/shared';
import { LineaFacturaDto } from './linea-factura.dto';

/** Crear una factura (BORRADOR). Cliente opcional (consumidor final). */
export class CrearFacturaDto implements CrearFacturaRequest {
  @IsOptional()
  @Matches(/^\d{13}$/, { message: 'La identidad del cliente debe tener 13 dígitos.' })
  clienteIdentidad?: string | null;

  @IsIn(['CONTADO', 'CREDITO'], { message: 'El tipo de pago debe ser CONTADO o CREDITO.' })
  tipoPago!: TipoPago;

  @IsArray()
  @ArrayMinSize(1, { message: 'La factura debe tener al menos una línea.' })
  @ValidateNested({ each: true })
  @Type(() => LineaFacturaDto)
  items!: LineaFacturaDto[];
}
