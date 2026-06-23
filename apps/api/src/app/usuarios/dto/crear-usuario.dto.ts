import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
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

  @IsOptional()
  @Matches(/^\d{13}$/, { message: 'La identidad debe tener 13 dígitos.' })
  identidad?: string | null;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password!: string;

  @IsIn(ROLES, { message: 'Rol inválido.' })
  rol!: RolUsuario;
}
