import { IsInt, Min } from 'class-validator';
import type { CapturarBolsasRealesRequest } from '@pane/shared';

/** Capturar las bolsas realmente producidas (para medir la merma). */
export class CapturarBolsasRealesDto implements CapturarBolsasRealesRequest {
  @IsInt({ message: 'Las bolsas reales deben ser un entero.' })
  @Min(0, { message: 'Las bolsas reales no pueden ser negativas.' })
  bolsasReales!: number;
}
