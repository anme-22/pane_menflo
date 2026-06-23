import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import type { RestablecerPasswordResponse, UsuarioDto } from '@pane/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { toUsuarioDto } from './usuario.mapper';

const BCRYPT_ROUNDS = 10;
const LONGITUD_PASSWORD_TEMPORAL = 10;
// Alfabeto sin caracteres ambiguos (0/O, 1/l/I) para una temporal legible.
const ALFABETO_TEMPORAL = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/** Genera una contraseña temporal aleatoria y segura (crypto). */
function generarPasswordTemporal(): string {
  let password = '';
  for (let i = 0; i < LONGITUD_PASSWORD_TEMPORAL; i++) {
    password += ALFABETO_TEMPORAL[randomInt(ALFABETO_TEMPORAL.length)];
  }
  return password;
}

/**
 * Gestión de usuarios (SOLID-S). NO existe borrado físico: un usuario se
 * "elimina" desactivándolo (`activo = false`), conservando el rastro.
 */
@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista todos los usuarios (ordenados por creación). */
  async listar(): Promise<UsuarioDto[]> {
    const usuarios = await this.prisma.usuario.findMany({
      orderBy: { creadoEn: 'asc' },
    });
    return usuarios.map(toUsuarioDto);
  }

  /** Obtiene un usuario por id o lanza 404. */
  async obtener(id: number): Promise<UsuarioDto> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    return toUsuarioDto(usuario);
  }

  /** Crea un usuario con la contraseña hasheada. Email (e identidad) únicos. */
  async crear(dto: CrearUsuarioDto): Promise<UsuarioDto> {
    await this.verificarEmailLibre(dto.email);
    if (dto.identidad) {
      await this.verificarIdentidadLibre(dto.identidad);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const usuario = await this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        email: dto.email,
        identidad: dto.identidad ?? null,
        passwordHash,
        rol: dto.rol,
      },
    });
    return toUsuarioDto(usuario);
  }

  /** Actualiza campos del usuario. Re-hashea la contraseña solo si viene. */
  async actualizar(id: number, dto: ActualizarUsuarioDto): Promise<UsuarioDto> {
    await this.asegurarExiste(id);

    if (dto.email) {
      await this.verificarEmailLibre(dto.email, id);
    }
    if (dto.identidad) {
      await this.verificarIdentidadLibre(dto.identidad, id);
    }

    const data: {
      nombre?: string;
      email?: string;
      identidad?: string | null;
      rol?: UsuarioDto['rol'];
      passwordHash?: string;
    } = {
      nombre: dto.nombre,
      email: dto.email,
      // undefined = sin cambio; null = quitar la identidad; string = asignar.
      identidad: dto.identidad,
      rol: dto.rol,
    };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    const usuario = await this.prisma.usuario.update({ where: { id }, data });
    return toUsuarioDto(usuario);
  }

  /**
   * Restablece la contraseña de un usuario (solo super_admin). Genera una
   * temporal aleatoria, la guarda hasheada y la devuelve UNA vez en claro para
   * que el super_admin se la comunique al empleado (no hay correo en local).
   */
  async restablecerPassword(id: number): Promise<RestablecerPasswordResponse> {
    await this.asegurarExiste(id);
    const password = generarPasswordTemporal();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.prisma.usuario.update({ where: { id }, data: { passwordHash } });
    return { password };
  }

  /**
   * Activa/desactiva un usuario. Un usuario no puede desactivarse a sí mismo
   * (evita quedarse sin acceso).
   */
  async cambiarEstado(
    id: number,
    activo: boolean,
    actorId: number,
  ): Promise<UsuarioDto> {
    await this.asegurarExiste(id);

    if (!activo && id === actorId) {
      throw new BadRequestException('No puedes desactivar tu propio usuario.');
    }

    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: { activo },
    });
    return toUsuarioDto(usuario);
  }

  // ---- helpers privados ----

  private async asegurarExiste(id: number): Promise<void> {
    const existe = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existe) {
      throw new NotFoundException('Usuario no encontrado.');
    }
  }

  private async verificarEmailLibre(email: string, exceptoId?: number): Promise<void> {
    const otro = await this.prisma.usuario.findUnique({ where: { email } });
    if (otro && otro.id !== exceptoId) {
      throw new ConflictException('Ya existe un usuario con ese email.');
    }
  }

  private async verificarIdentidadLibre(
    identidad: string,
    exceptoId?: number,
  ): Promise<void> {
    const otro = await this.prisma.usuario.findUnique({ where: { identidad } });
    if (otro && otro.id !== exceptoId) {
      throw new ConflictException('Ya existe un usuario con esa identidad.');
    }
  }
}
