import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches } from 'class-validator';
import type { ComprasQuery } from '@pane/shared';
import { QueryPaginadoDto } from '../../common/query-paginado.dto';

/** Filtros + paginación del listado de compras (query string). */
export class ComprasQueryDto extends QueryPaginadoDto implements ComprasQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  insumoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  proveedorId?: number;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha "desde" debe ser YYYY-MM-DD.' })
  desde?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha "hasta" debe ser YYYY-MM-DD.' })
  hasta?: string;
}
