import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PAGE_SIZE_MAX, type QueryPaginado } from '@pane/shared';

/**
 * DTO base de paginación (page/pageSize). Los DTOs de cada listado lo extienden
 * y añaden sus filtros. `transform: true` (main.ts) coacciona los query strings.
 */
export class QueryPaginadoDto implements QueryPaginado {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGE_SIZE_MAX)
  pageSize?: number;
}
