import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { CrearClienteRequest } from '@pane/shared';

/** Crear cliente. La identidad son 13 dígitos; el sexo es un código numérico. */
export class CrearClienteDto implements CrearClienteRequest {
  @IsString()
  @Matches(/^\d{13}$/, { message: 'La identidad debe tener 13 dígitos.' })
  identidad!: string;

  @IsString()
  @MinLength(2, { message: 'El nombre es muy corto.' })
  @MaxLength(101)
  nombre!: string;

  @IsString()
  @MinLength(2, { message: 'El apellido es muy corto.' })
  @MaxLength(101)
  apellido!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string | null;

  @IsInt({ message: 'El sexo debe ser un código numérico.' })
  sexo!: number;
}
