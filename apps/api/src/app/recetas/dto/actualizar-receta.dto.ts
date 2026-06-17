import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { ActualizarRecetaRequest } from '@pane/shared';
import { IngredienteDto } from './ingrediente.dto';

/** Actualizar receta. Si `ingredientes` viene, reemplaza todo el set. */
export class ActualizarRecetaDto implements ActualizarRecetaRequest {
  @IsOptional()
  @IsInt()
  @IsPositive({ message: 'El rendimiento debe ser mayor que 0.' })
  rendimiento?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  unidadLote?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'La receta necesita al menos un ingrediente.' })
  @ValidateNested({ each: true })
  @Type(() => IngredienteDto)
  ingredientes?: IngredienteDto[];
}
