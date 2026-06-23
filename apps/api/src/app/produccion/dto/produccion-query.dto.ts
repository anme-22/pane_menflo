import { IsIn, IsOptional, Matches } from 'class-validator';
import type { EstadoProduccion, ProduccionQuery } from '@pane/shared';
import { QueryPaginadoDto } from '../../common/query-paginado.dto';

/** Filtros + paginación del listado de órdenes de producción (query string). */
export class ProduccionQueryDto extends QueryPaginadoDto implements ProduccionQuery {
  @IsOptional()
  @IsIn(['BORRADOR', 'CONFIRMADA', 'ANULADA'])
  estado?: EstadoProduccion;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha "desde" debe ser YYYY-MM-DD.' })
  desde?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha "hasta" debe ser YYYY-MM-DD.' })
  hasta?: string;
}
