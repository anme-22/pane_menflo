import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { ActualizarInsumoRequest } from '@pane/shared';

/** Actualizar insumo: solo el nombre (el tipo no cambia tras crearse). */
export class ActualizarInsumoDto implements ActualizarInsumoRequest {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre es muy corto.' })
  @MaxLength(150)
  nombre?: string;
}
