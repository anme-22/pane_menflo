import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '@pane/shared';
import type { Usuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Valida el JWT en cada request protegida. Además de verificar la firma y la
 * expiración, comprueba que el usuario aún exista y siga activo (un usuario
 * desactivado no puede seguir operando aunque su token no haya expirado).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'cambia_esto',
    });
  }

  /** El valor retornado se inyecta en `request.user`. */
  async validate(payload: JwtPayload): Promise<Usuario> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo.');
    }
    return usuario;
  }
}
