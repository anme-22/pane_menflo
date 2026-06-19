import { IsInt, IsPositive } from 'class-validator';
import type { ActualizarParametrosRequest } from '@pane/shared';

/** Actualizar el parámetro de prorrateo (quintales producidos al mes). */
export class ActualizarParametrosDto implements ActualizarParametrosRequest {
  @IsInt({ message: 'quintalesPorMes debe ser un entero.' })
  @IsPositive({ message: 'quintalesPorMes debe ser mayor que 0.' })
  quintalesPorMes!: number;
}
