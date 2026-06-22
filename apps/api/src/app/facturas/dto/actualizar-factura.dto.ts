import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { METODOS_PAGO } from '@pane/shared';
import type { ActualizarFacturaRequest, TipoPago } from '@pane/shared';
import { LineaFacturaDto } from './linea-factura.dto';

/**
 * Editar una factura. En BORRADOR es libre; en EMITIDA el `motivo` es obligatorio
 * (lo valida el servicio). `items` reemplaza todo el set de líneas.
 */
export class ActualizarFacturaDto implements ActualizarFacturaRequest {
  @IsOptional()
  @Matches(/^\d{13}$/, { message: 'La identidad del cliente debe tener 13 dígitos.' })
  clienteIdentidad?: string | null;

  @IsOptional()
  @IsIn(['CONTADO', 'CREDITO'], { message: 'El tipo de pago debe ser CONTADO o CREDITO.' })
  tipoPago?: TipoPago;

  @IsOptional()
  @IsIn(METODOS_PAGO, { message: 'Método de pago no válido.' })
  metodoPago?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'La factura debe tener al menos una línea.' })
  @ValidateNested({ each: true })
  @Type(() => LineaFacturaDto)
  items?: LineaFacturaDto[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;
}
