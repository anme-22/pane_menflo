import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { RegistrarAbonoRequest } from '@pane/shared';

/** Registrar un abono (solo facturas de crédito emitidas). */
export class RegistrarAbonoDto implements RegistrarAbonoRequest {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto admite hasta 2 decimales.' })
  @IsPositive({ message: 'El monto debe ser mayor que 0.' })
  monto!: number;

  @IsString()
  @MinLength(1, { message: 'Indica el método de pago.' })
  @MaxLength(30)
  metodo!: string;

  @IsOptional()
  @IsISO8601()
  fecha?: string;
}
