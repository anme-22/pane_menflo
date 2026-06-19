import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { CrearAjusteRequest } from '@pane/shared';

/**
 * Ajuste manual de stock de un insumo (conteo físico, merma de insumo, regalo…).
 * La cantidad llega en cualquier unidad del tipo del insumo; el servicio la
 * convierte a la unidad base. El motivo es obligatorio (queda en el kardex).
 */
export class CrearAjusteDto implements CrearAjusteRequest {
  @IsInt()
  insumoId!: number;

  @IsBoolean({ message: 'La dirección del ajuste (aumentar/disminuir) es obligatoria.' })
  incrementa!: boolean;

  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'La cantidad admite hasta 4 decimales.' })
  @IsPositive({ message: 'La cantidad debe ser mayor que 0.' })
  cantidad!: number;

  @IsInt()
  unidadId!: number;

  @IsString()
  @MinLength(3, { message: 'El motivo es obligatorio (mínimo 3 caracteres).' })
  @MaxLength(255, { message: 'El motivo no debe pasar de 255 caracteres.' })
  motivo!: string;
}
