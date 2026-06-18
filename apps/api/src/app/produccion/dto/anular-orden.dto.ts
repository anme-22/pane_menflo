import { IsString, MaxLength, MinLength } from 'class-validator';
import type { AnularOrdenProduccionRequest } from '@pane/shared';

/** Anular una orden: el motivo es obligatorio (deja rastro; no se borra). */
export class AnularOrdenDto implements AnularOrdenProduccionRequest {
  @IsString()
  @MinLength(3, { message: 'El motivo es obligatorio (mín. 3 caracteres).' })
  @MaxLength(300, { message: 'El motivo admite máximo 300 caracteres.' })
  motivo!: string;
}
