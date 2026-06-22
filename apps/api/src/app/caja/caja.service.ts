import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CajaSesion } from '@prisma/client';
import type {
  CajaResumenDto,
  CajaSesionDto,
  CajaSesionResumenDto,
} from '@pane/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SucursalesService } from '../sucursales/sucursales.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { RegistrarMovimientoCajaDto } from './dto/registrar-movimiento-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import {
  CajaSesionConRelaciones,
  toCajaSesionDto,
  toCajaSesionResumenDto,
} from './caja.mapper';

/** Método de pago en efectivo (el único que entra al arqueo físico). */
const EFECTIVO = 'Efectivo';

const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Relaciones que se cargan para mapear una sesión completa. */
const CON_RELACIONES = {
  usuarioApertura: true,
  usuarioCierre: true,
  movimientos: { include: { usuario: true }, orderBy: { id: 'asc' } },
} as const;

/**
 * Caja / Arqueo (SOLID-S). Una sesión abre con un fondo, acumula el efectivo del
 * periodo (ventas de contado en efectivo + abonos en efectivo + ingresos/egresos
 * manuales) y se cierra contando el efectivo físico contra el esperado. El
 * esperado se CALCULA por ventana de tiempo (la factura no se acopla a la caja);
 * al cerrar se congela junto con la diferencia. Una sola sesión ABIERTA por
 * sucursal a la vez. Los tres roles operan; nada se borra.
 */
@Injectable()
export class CajaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sucursales: SucursalesService,
  ) {}

  /** Sesión ABIERTA de la sucursal por defecto (con resumen en vivo) o null. */
  async obtenerActual(): Promise<CajaSesionDto | null> {
    const sucursalId = await this.sucursales.obtenerDefaultId();
    const sesion = await this.prisma.cajaSesion.findFirst({
      where: { sucursalId, estado: 'ABIERTA' },
      include: CON_RELACIONES,
    });
    if (!sesion) {
      return null;
    }
    return this.componer(sesion);
  }

  /** Histórico de sesiones (recientes primero). */
  async listar(): Promise<CajaSesionResumenDto[]> {
    const sesiones = await this.prisma.cajaSesion.findMany({
      orderBy: { id: 'desc' },
      include: { usuarioApertura: true },
    });
    return sesiones.map(toCajaSesionResumenDto);
  }

  /** Detalle de una sesión (movimientos + resumen) o 404. */
  async obtener(id: number): Promise<CajaSesionDto> {
    const sesion = await this.prisma.cajaSesion.findUnique({
      where: { id },
      include: CON_RELACIONES,
    });
    if (!sesion) {
      throw new NotFoundException('Sesión de caja no encontrada.');
    }
    return this.componer(sesion);
  }

  /** Abre una sesión de caja. Falla si ya hay una ABIERTA en la sucursal. */
  async abrir(dto: AbrirCajaDto, usuarioId: number): Promise<CajaSesionDto> {
    const sucursalId = await this.sucursales.obtenerDefaultId();
    const abierta = await this.prisma.cajaSesion.findFirst({
      where: { sucursalId, estado: 'ABIERTA' },
      select: { id: true },
    });
    if (abierta) {
      throw new ConflictException(
        'Ya hay una caja abierta. Ciérrala antes de abrir otra.',
      );
    }
    const sesion = await this.prisma.cajaSesion.create({
      data: {
        sucursalId,
        montoInicial: dto.montoInicial,
        usuarioAperturaId: usuarioId,
      },
      include: CON_RELACIONES,
    });
    return this.componer(sesion);
  }

  /** Registra un movimiento manual (solo en una sesión ABIERTA). */
  async registrarMovimiento(
    id: number,
    dto: RegistrarMovimientoCajaDto,
    usuarioId: number,
  ): Promise<CajaSesionDto> {
    const sesion = await this.exigirAbierta(id);
    await this.prisma.movimientoCaja.create({
      data: {
        cajaSesionId: sesion.id,
        tipo: dto.tipo,
        monto: dto.monto,
        concepto: dto.concepto.trim(),
        usuarioId,
      },
    });
    return this.obtener(id);
  }

  /** Cierra la sesión: congela esperado, conteo y diferencia. */
  async cerrar(
    id: number,
    dto: CerrarCajaDto,
    usuarioId: number,
  ): Promise<CajaSesionDto> {
    const sesion = await this.exigirAbierta(id);
    const resumen = await this.calcularResumen(sesion);
    const esperado = Number(resumen.efectivoEsperado);
    const diferencia = r2(dto.montoContado - esperado);
    await this.prisma.cajaSesion.update({
      where: { id },
      data: {
        estado: 'CERRADA',
        montoContado: dto.montoContado,
        montoEsperado: esperado,
        diferencia,
        usuarioCierreId: usuarioId,
        cerradaEn: new Date(),
        observacion: dto.observacion?.trim() || null,
      },
    });
    return this.obtener(id);
  }

  // ---- helpers privados ----

  /** Carga la sesión y exige que exista y esté ABIERTA. */
  private async exigirAbierta(id: number): Promise<CajaSesion> {
    const sesion = await this.prisma.cajaSesion.findUnique({ where: { id } });
    if (!sesion) {
      throw new NotFoundException('Sesión de caja no encontrada.');
    }
    if (sesion.estado !== 'ABIERTA') {
      throw new BadRequestException('La caja ya está cerrada.');
    }
    return sesion;
  }

  /** Mapea la sesión calculando su resumen en vivo. */
  private async componer(s: CajaSesionConRelaciones): Promise<CajaSesionDto> {
    const resumen = await this.calcularResumen(s);
    return toCajaSesionDto(s, resumen);
  }

  /**
   * Desglose del efectivo dentro de la ventana [abiertaEn, cerradaEn ?? ahora).
   * Solo el efectivo entra al esperado; las ventas con otros métodos se reportan
   * aparte. Las ventas/abonos se calculan por ventana (no se acoplan a la caja).
   */
  private async calcularResumen(s: CajaSesion): Promise<CajaResumenDto> {
    const ventana = { gte: s.abiertaEn, lt: s.cerradaEn ?? new Date() };
    const baseVenta = {
      estado: 'EMITIDA' as const,
      tipoPago: 'CONTADO' as const,
      sucursalId: s.sucursalId,
      emitidaEn: ventana,
    };

    const [ventasEfectivo, ventasOtros, abonos, ingresos, egresos] =
      await Promise.all([
        this.prisma.factura.aggregate({
          _sum: { total: true },
          where: { ...baseVenta, metodoPago: EFECTIVO },
        }),
        this.prisma.factura.aggregate({
          _sum: { total: true },
          where: { ...baseVenta, metodoPago: { not: EFECTIVO } },
        }),
        this.prisma.abono.aggregate({
          _sum: { monto: true },
          where: {
            metodo: EFECTIVO,
            fecha: ventana,
            factura: { sucursalId: s.sucursalId },
          },
        }),
        this.prisma.movimientoCaja.aggregate({
          _sum: { monto: true },
          where: { cajaSesionId: s.id, tipo: 'INGRESO' },
        }),
        this.prisma.movimientoCaja.aggregate({
          _sum: { monto: true },
          where: { cajaSesionId: s.id, tipo: 'EGRESO' },
        }),
      ]);

    const montoInicial = Number(s.montoInicial);
    const vEfectivo = Number(ventasEfectivo._sum.total ?? 0);
    const vOtros = Number(ventasOtros._sum.total ?? 0);
    const aEfectivo = Number(abonos._sum.monto ?? 0);
    const ing = Number(ingresos._sum.monto ?? 0);
    const egr = Number(egresos._sum.monto ?? 0);
    const esperado = r2(montoInicial + vEfectivo + aEfectivo + ing - egr);

    return {
      montoInicial: r2(montoInicial).toString(),
      ventasContadoEfectivo: r2(vEfectivo).toString(),
      abonosEfectivo: r2(aEfectivo).toString(),
      ingresos: r2(ing).toString(),
      egresos: r2(egr).toString(),
      efectivoEsperado: esperado.toString(),
      ventasOtrosMetodos: r2(vOtros).toString(),
    };
  }
}
