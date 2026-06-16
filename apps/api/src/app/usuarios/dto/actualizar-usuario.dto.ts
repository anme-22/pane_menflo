import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ROLES,
  type ActualizarUsuarioRequest,
  type RolUsuario,
} from '@pane/shared';

/**
 * Datos validados para actualizar un usuario (`PATCH /api/usuarios/:id`).
 * Todos opcionales: solo se cambian los campos enviados. `password` solo se
 * incluye cuando se quiere restablecer.
 */
export class ActualizarUsuarioDto implements ActualizarUsuarioRequest {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email no es válido.' })
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password?: string;

  @IsOptional()
  @IsIn(ROLES, { message: 'Rol inválido.' })
  rol?: RolUsuario;
}
