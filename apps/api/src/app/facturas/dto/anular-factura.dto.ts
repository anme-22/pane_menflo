import { IsString, MaxLength, MinLength } from 'class-validator';
import type { AnularFacturaRequest } from '@pane/shared';

/** Anular una factura: el motivo es obligatorio (deja rastro; no se borra). */
export class AnularFacturaDto implements AnularFacturaRequest {
  @IsString()
  @MinLength(3, { message: 'El motivo es obligatorio (mín. 3 caracteres).' })
  @MaxLength(300, { message: 'El motivo admite máximo 300 caracteres.' })
  motivo!: string;
}
