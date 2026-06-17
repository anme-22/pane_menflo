import { IsInt, IsNumber, IsPositive } from 'class-validator';
import type { IngredienteInput } from '@pane/shared';

/** Un ingrediente dentro de una receta (validación anidada). */
export class IngredienteDto implements IngredienteInput {
  @IsInt()
  insumoId!: number;

  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'La cantidad admite hasta 4 decimales.' })
  @IsPositive({ message: 'La cantidad debe ser mayor que 0.' })
  cantidad!: number;

  @IsInt()
  unidadId!: number;
}
