import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import type { EstadoFactura, FacturasQuery, TipoPago } from '@pane/shared';
import { QueryPaginadoDto } from '../../common/query-paginado.dto';

/** Filtros + paginación del listado de facturas (query string). */
export class FacturasQueryDto extends QueryPaginadoDto implements FacturasQuery {
  @IsOptional()
  @IsIn(['BORRADOR', 'EMITIDA', 'ANULADA'])
  estado?: EstadoFactura;

  @IsOptional()
  @IsIn(['CONTADO', 'CREDITO'])
  tipoPago?: TipoPago;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha "desde" debe ser YYYY-MM-DD.' })
  desde?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha "hasta" debe ser YYYY-MM-DD.' })
  hasta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  buscar?: string;
}
