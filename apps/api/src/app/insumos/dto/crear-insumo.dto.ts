import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import type { CrearInsumoRequest, TipoUnidad } from '@pane/shared';

/** Crear insumo. El `tipo` define la unidad base y es fijo tras crearse. */
export class CrearInsumoDto implements CrearInsumoRequest {
  @IsString()
  @MinLength(2, { message: 'El nombre es muy corto.' })
  @MaxLength(150)
  nombre!: string;

  @IsIn(['peso', 'volumen', 'conteo'], {
    message: 'El tipo debe ser peso, volumen o conteo.',
  })
  tipo!: TipoUnidad;
}
