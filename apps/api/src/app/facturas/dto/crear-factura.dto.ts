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
import type { CrearFacturaRequest, TipoPago } from '@pane/shared';
import { LineaFacturaDto } from './linea-factura.dto';

/** Crear una factura (BORRADOR). Cliente opcional (consumidor final). */
export class CrearFacturaDto implements CrearFacturaRequest {
  @IsOptional()
  @Matches(/^\d{13}$/, { message: 'La identidad del cliente debe tener 13 dígitos.' })
  clienteIdentidad?: string | null;

  @IsIn(['CONTADO', 'CREDITO'], { message: 'El tipo de pago debe ser CONTADO o CREDITO.' })
  tipoPago!: TipoPago;

  // El servicio exige el método cuando tipoPago es CONTADO; aquí solo se valida
  // que, si viene, sea uno de los soportados.
  @IsOptional()
  @IsIn(METODOS_PAGO, { message: 'Método de pago no válido.' })
  metodoPago?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivoCortesia?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'La factura debe tener al menos una línea.' })
  @ValidateNested({ each: true })
  @Type(() => LineaFacturaDto)
  items!: LineaFacturaDto[];
}
