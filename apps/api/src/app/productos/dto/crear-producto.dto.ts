import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { CrearProductoRequest } from '@pane/shared';

/** Crear producto: el precio inicial es obligatorio y positivo. */
export class CrearProductoDto implements CrearProductoRequest {
  @IsString()
  @MinLength(2, { message: 'El nombre es muy corto.' })
  @MaxLength(150)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string | null;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio admite máximo 2 decimales.' })
  @IsPositive({ message: 'El precio debe ser mayor que 0.' })
  precio!: number;
}
