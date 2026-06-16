import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Exige un JWT válido (estrategia 'jwt'). Rechaza con 401 si falta o es inválido.
 * Pone el usuario autenticado en `request.user`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
