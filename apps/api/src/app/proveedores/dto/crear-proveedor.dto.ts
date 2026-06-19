import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { CrearProveedorRequest } from '@pane/shared';

/** Crear un proveedor. El nombre debe ser único (se valida también en BD). */
export class CrearProveedorDto implements CrearProveedorRequest {
  @IsString()
  @MinLength(2, { message: 'El nombre es obligatorio (mínimo 2 caracteres).' })
  @MaxLength(120)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;
}
