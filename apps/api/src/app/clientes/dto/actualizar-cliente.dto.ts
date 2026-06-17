import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { ActualizarClienteRequest } from '@pane/shared';

/** Actualizar cliente. Todos los campos opcionales; la identidad no cambia. */
export class ActualizarClienteDto implements ActualizarClienteRequest {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre es muy corto.' })
  @MaxLength(101)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El apellido es muy corto.' })
  @MaxLength(101)
  apellido?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string | null;

  @IsOptional()
  @IsInt({ message: 'El sexo debe ser un código numérico.' })
  sexo?: number;
}
