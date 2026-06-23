import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { JwtPayload, LoginResponse } from '@pane/shared';
import type { Usuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toUsuarioDto } from '../usuarios/usuario.mapper';
import { LoginDto } from './dto/login.dto';

/**
 * Lógica de autenticación (SOLID-S). El controlador solo orquesta; aquí vive
 * la validación de credenciales y la emisión del token.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Valida credenciales y devuelve el usuario, o lanza 401. */
  private async validarCredenciales(
    identificador: string,
    password: string,
  ): Promise<Usuario> {
    // El identificador casa contra el correo O la identidad (sin adivinar el
    // formato: un correo no casa una cédula y viceversa).
    const id = identificador.trim();
    const usuario = await this.prisma.usuario.findFirst({
      where: { OR: [{ email: id }, { identidad: id }] },
    });

    // Mensaje genérico a propósito: no revelar si la cuenta existe.
    const credencialesInvalidas = new UnauthorizedException(
      'Credenciales inválidas.',
    );

    if (!usuario || !usuario.activo) {
      // Compara igualmente para no filtrar por tiempo de respuesta.
      await bcrypt.compare(password, '$2a$10$invalidinvalidinvalidinvalidinv');
      throw credencialesInvalidas;
    }

    const ok = await bcrypt.compare(password, usuario.passwordHash);
    if (!ok) {
      throw credencialesInvalidas;
    }
    return usuario;
  }

  /** Login: valida y emite el access token. */
  async login(dto: LoginDto): Promise<LoginResponse> {
    const usuario = await this.validarCredenciales(
      dto.identificador,
      dto.password,
    );

    // Payload mínimo y no sensible (sin hash). El rol se verifica en cada
    // request porque la firma lo protege contra manipulación.
    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      usuario: toUsuarioDto(usuario),
    };
  }
}
