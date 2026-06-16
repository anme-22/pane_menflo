import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import type { LoginRequest } from '@pane/shared';

/** Cuerpo validado del login (`POST /api/auth/login`). */
export class LoginDto implements LoginRequest {
  @IsEmail({}, { message: 'El email no es válido.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  password!: string;
}
