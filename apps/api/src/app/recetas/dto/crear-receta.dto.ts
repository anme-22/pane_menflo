import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { CrearRecetaRequest } from '@pane/shared';
import { IngredienteDto } from './ingrediente.dto';

/** Crear receta para un producto (que aún no tenga). Mínimo 1 ingrediente. */
export class CrearRecetaDto implements CrearRecetaRequest {
  @IsInt()
  productoId!: number;

  @IsInt()
  @IsPositive({ message: 'El rendimiento debe ser mayor que 0.' })
  rendimiento!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  unidadLote!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'La receta necesita al menos un ingrediente.' })
  @ValidateNested({ each: true })
  @Type(() => IngredienteDto)
  ingredientes!: IngredienteDto[];
}
