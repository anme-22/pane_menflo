import { IsInt, IsNumber, IsPositive } from 'class-validator';
import type { CoberturaRequest } from '@pane/shared';

/** Escenario de cobertura: producir `sacosPorDia` lotes de un producto. */
export class CoberturaDto implements CoberturaRequest {
  @IsInt()
  productoId!: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Los sacos/día admiten hasta 2 decimales.' })
  @IsPositive({ message: 'Los sacos/día deben ser mayor que 0.' })
  sacosPorDia!: number;
}
