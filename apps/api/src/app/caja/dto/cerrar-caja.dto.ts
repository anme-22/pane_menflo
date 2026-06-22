import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type { CerrarCajaRequest } from '@pane/shared';

/** Cerrar la sesión con el conteo físico del efectivo (>= 0). */
export class CerrarCajaDto implements CerrarCajaRequest {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto contado debe ser numérico.' })
  @Min(0, { message: 'El monto contado no puede ser negativo.' })
  montoContado!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  observacion?: string;
}
