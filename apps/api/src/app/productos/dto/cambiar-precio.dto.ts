import { IsNumber, IsPositive } from 'class-validator';
import type { CambiarPrecioRequest } from '@pane/shared';

/** Cambiar el precio de un producto (cierra el vigente y abre uno nuevo). */
export class CambiarPrecioDto implements CambiarPrecioRequest {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio admite máximo 2 decimales.' })
  @IsPositive({ message: 'El precio debe ser mayor que 0.' })
  precio!: number;
}
