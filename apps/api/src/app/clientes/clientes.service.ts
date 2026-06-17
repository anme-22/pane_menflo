import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ClienteDto } from '@pane/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';
import { toClienteDto } from './cliente.mapper';

/**
 * Gestión de clientes (SOLID-S). La identidad es la clave natural. NO hay
 * borrado físico: un cliente se desactiva (`activo = false`) conservando el
 * rastro (coherente con "no borrar registros de negocio").
 */
@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista todos los clientes (ordenados por creación). */
  async listar(): Promise<ClienteDto[]> {
    const clientes = await this.prisma.cliente.findMany({
      orderBy: { creadoEn: 'asc' },
    });
    return clientes.map(toClienteDto);
  }

  /** Obtiene un cliente por identidad o lanza 404. */
  async obtener(identidad: string): Promise<ClienteDto> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { identidad },
    });
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado.');
    }
    return toClienteDto(cliente);
  }

  /** Crea un cliente. La identidad debe ser única. */
  async crear(dto: CrearClienteDto): Promise<ClienteDto> {
    const existe = await this.prisma.cliente.findUnique({
      where: { identidad: dto.identidad },
      select: { identidad: true },
    });
    if (existe) {
      throw new ConflictException('Ya existe un cliente con esa identidad.');
    }

    const cliente = await this.prisma.cliente.create({
      data: {
        identidad: dto.identidad,
        nombre: dto.nombre,
        apellido: dto.apellido,
        telefono: dto.telefono ?? null,
        sexo: dto.sexo,
      },
    });
    return toClienteDto(cliente);
  }

  /** Actualiza datos del cliente (la identidad no cambia). */
  async actualizar(
    identidad: string,
    dto: ActualizarClienteDto,
  ): Promise<ClienteDto> {
    await this.asegurarExiste(identidad);
    const cliente = await this.prisma.cliente.update({
      where: { identidad },
      data: {
        nombre: dto.nombre,
        apellido: dto.apellido,
        telefono: dto.telefono,
        sexo: dto.sexo,
      },
    });
    return toClienteDto(cliente);
  }

  /** Activa/desactiva el cliente (no se borra). */
  async cambiarEstado(identidad: string, activo: boolean): Promise<ClienteDto> {
    await this.asegurarExiste(identidad);
    const cliente = await this.prisma.cliente.update({
      where: { identidad },
      data: { activo },
    });
    return toClienteDto(cliente);
  }

  private async asegurarExiste(identidad: string): Promise<void> {
    const existe = await this.prisma.cliente.findUnique({
      where: { identidad },
      select: { identidad: true },
    });
    if (!existe) {
      throw new NotFoundException('Cliente no encontrado.');
    }
  }
}
