import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { ROLES, type CrearUsuarioRequest, type RolUsuario } from '@pane/shared';

/** Datos validados para crear un usuario (`POST /api/usuarios`). */
export class CrearUsuarioDto implements CrearUsuarioRequest {
  @IsString()
  @MinLength(2, { message: 'El nombre es muy corto.' })
  @MaxLength(100)
  nombre!: string;

  @IsEmail({}, { message: 'El email no es válido.' })
  @MaxLength(150)
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password!: string;

  @IsIn(ROLES, { message: 'Rol inválido.' })
  rol!: RolUsuario;
}
