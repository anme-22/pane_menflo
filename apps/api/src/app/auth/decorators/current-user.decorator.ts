import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Usuario } from '@prisma/client';

/**
 * Inyecta el usuario autenticado (lo coloca `JwtStrategy.validate` en la
 * request). Uso: `metodo(@CurrentUser() usuario: Usuario)`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Usuario => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
