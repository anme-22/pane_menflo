import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import type { ClientesQuery } from '@pane/shared';
import { QueryPaginadoDto } from '../../common/query-paginado.dto';

/** Filtros + paginación del listado de clientes (query string). */
export class ClientesQueryDto extends QueryPaginadoDto implements ClientesQuery {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buscar?: string;

  // Los query strings llegan como texto: 'true'/'false' → boolean.
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  activo?: boolean;
}
