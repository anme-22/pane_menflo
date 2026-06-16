import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { ActualizarProductoRequest } from '@pane/shared';

/** Actualizar datos del producto (no el precio; eso va por su propio endpoint). */
export class ActualizarProductoDto implements ActualizarProductoRequest {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string | null;
}
