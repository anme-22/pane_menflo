import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { LoginRequest } from '@pane/shared';

/**
 * Cuerpo validado del login (`POST /api/auth/login`). `identificador` es el
 * correo O la identidad (cédula); el servicio resuelve cuál casa.
 */
export class LoginDto implements LoginRequest {
  @IsString()
  @IsNotEmpty({ message: 'Indica tu correo o identidad.' })
  @MaxLength(150)
  identificador!: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  password!: string;
}
