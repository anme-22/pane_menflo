import { IsIn, IsNumber, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';
import type { RegistrarMovimientoCajaRequest, TipoMovimientoCaja } from '@pane/shared';

/** Registrar un movimiento manual de caja (ingreso/egreso de efectivo). */
export class RegistrarMovimientoCajaDto implements RegistrarMovimientoCajaRequest {
  @IsIn(['INGRESO', 'EGRESO'], { message: 'El tipo debe ser INGRESO o EGRESO.' })
  tipo!: TipoMovimientoCaja;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe ser numérico.' })
  @IsPositive({ message: 'El monto debe ser mayor que cero.' })
  monto!: number;

  @IsString()
  @MinLength(3, { message: 'El concepto es obligatorio.' })
  @MaxLength(200)
  concepto!: string;
}
