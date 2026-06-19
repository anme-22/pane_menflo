import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { ActualizarProveedorRequest } from '@pane/shared';

/** Actualizar un proveedor (no se borra; el estado se cambia aparte). */
export class ActualizarProveedorDto implements ActualizarProveedorRequest {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;
}
