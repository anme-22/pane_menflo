import { IsInt, IsISO8601, IsNumber, IsOptional, IsPositive } from 'class-validator';
import type { CrearOrdenProduccionRequest } from '@pane/shared';

/** Crear una orden de producción: producto (con receta) + número de sacos. */
export class CrearOrdenDto implements CrearOrdenProduccionRequest {
  @IsInt()
  productoId!: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Los sacos admiten hasta 2 decimales.' })
  @IsPositive({ message: 'Los sacos deben ser mayor que 0.' })
  sacos!: number;

  @IsOptional()
  @IsISO8601()
  fecha?: string;
}
