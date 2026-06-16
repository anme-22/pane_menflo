import { IsBoolean } from 'class-validator';

/** Activa o desactiva un usuario (`PATCH /api/usuarios/:id/estado`). */
export class CambiarEstadoDto {
  @IsBoolean()
  activo!: boolean;
}
