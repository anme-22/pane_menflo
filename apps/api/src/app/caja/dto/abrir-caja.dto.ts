import { IsNumber, Min } from 'class-validator';
import type { AbrirCajaRequest } from '@pane/shared';

/** Abrir una sesión de caja con un fondo inicial (>= 0). */
export class AbrirCajaDto implements AbrirCajaRequest {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto inicial debe ser numérico.' })
  @Min(0, { message: 'El monto inicial no puede ser negativo.' })
  montoInicial!: number;
}
