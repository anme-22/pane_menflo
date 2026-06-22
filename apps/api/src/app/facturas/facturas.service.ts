import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Configuracion } from '@prisma/client';
import type {
  FacturaDto,
  FacturaResumenDto,
  LineaFacturaInput,
  TipoPago,
} from '@pane/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SucursalesService } from '../sucursales/sucursales.service';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import {
  ESTRATEGIA_IMPUESTO,
  EstrategiaImpuesto,
} from '../impuesto/estrategia-impuesto';
import { CrearFacturaDto } from './dto/crear-factura.dto';
import { ActualizarFacturaDto } from './dto/actualizar-factura.dto';
import { AnularFacturaDto } from './dto/anular-factura.dto';
import { RegistrarAbonoDto } from './dto/registrar-abono.dto';
import { BitacoraService, EntradaBitacora } from './bitacora.service';
import { toFacturaDto, toFacturaResumenDto } from './factura.mapper';

/** Línea ya resuelta con su snapshot (precio/nombre del momento). */
interface LineaResuelta {
  productoId: number;
  nombreProducto: string;
  precioUnitario: number;
  cantidad: number;
  tasaImpuesto: number;
}

/** Relaciones que se cargan para mapear una factura completa. */
const CON_RELACIONES = {
  cliente: true,
  usuario: true,
  detalles: true,
  abonos: { orderBy: { id: 'asc' } },
  bitacora: { include: { usuario: true }, orderBy: { cuando: 'asc' } },
} as const;

/**
 * Facturación (SOLID-S). El detalle COPIA nombre y precio del producto (snapshot):
 * la factura es la verdad histórica y no depende de la tabla de precios. El
 * impuesto se calcula con una estrategia inyectada (DI); el saldo/estado de pago
 * se calculan desde los abonos. Estados BORRADOR→EMITIDA→ANULADA; nada se borra,
 * y los cambios sobre una EMITIDA exigen motivo y quedan en la bitácora.
 */
@Injectable()
export class FacturasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sucursales: SucursalesService,
    private readonly configuracion: ConfiguracionService,
    private readonly bitacora: BitacoraService,
    @Inject(ESTRATEGIA_IMPUESTO) private readonly impuesto: EstrategiaImpuesto,
  ) {}

  /** Lista facturas (resumen, con saldo/estado de pago), recientes primero. */
  async listar(): Promise<FacturaResumenDto[]> {
    const facturas = await this.prisma.factura.findMany({
      orderBy: { id: 'desc' },
      include: { cliente: true, abonos: { select: { monto: true } } },
    });
    return facturas.map(toFacturaResumenDto);
  }

  /** Obtiene una factura (con detalle, abonos y bitácora) o lanza 404. */
  async obtener(id: number): Promise<FacturaDto> {
    const factura = await this.prisma.factura.findUnique({
      where: { id },
      include: CON_RELACIONES,
    });
    if (!factura) {
      throw new NotFoundException('Factura no encontrada.');
    }
    return toFacturaDto(factura);
  }

  /** Crea una factura en BORRADOR (snapshot de precios al momento). */
  async crear(dto: CrearFacturaDto, usuarioId: number): Promise<FacturaDto> {
    const config = await this.configuracion.obtener();
    await this.validarCliente(dto.clienteIdentidad);
    const lineas = await this.construirLineas(dto.items, config);
    const totales = this.calcular(lineas);
    const sucursalId = await this.sucursales.obtenerDefaultId();

    const factura = await this.prisma.factura.create({
      data: {
        sucursalId,
        clienteIdentidad: dto.clienteIdentidad ?? null,
        usuarioId,
        tipoPago: dto.tipoPago,
        metodoPago: this.resolverMetodoPago(dto.tipoPago, dto.metodoPago),
        estado: 'BORRADOR',
        subtotal: totales.subtotal,
        impuesto: totales.impuesto,
        total: totales.total,
        detalles: { create: lineas },
      },
    });
    return this.obtener(factura.id);
  }

  /**
   * Edita una factura. BORRADOR: libre. EMITIDA: exige `motivo` y registra en la
   * bitácora cada campo cambiado. ANULADA: no se edita. `items` reemplaza el set.
   */
  async actualizar(
    id: number,
    dto: ActualizarFacturaDto,
    usuarioId: number,
  ): Promise<FacturaDto> {
    const factura = await this.prisma.factura.findUnique({
      where: { id },
      include: { detalles: true },
    });
    if (!factura) {
      throw new NotFoundException('Factura no encontrada.');
    }
    if (factura.estado === 'ANULADA') {
      throw new BadRequestException('Una factura anulada no se puede editar.');
    }
    const emitida = factura.estado === 'EMITIDA';
    if (emitida && !dto.motivo?.trim()) {
      throw new BadRequestException(
        'Editar una factura emitida exige un motivo (queda en la bitácora).',
      );
    }
    await this.validarCliente(dto.clienteIdentidad);

    const config = await this.configuracion.obtener();
    const cambiaItems = dto.items !== undefined;
    const lineas = cambiaItems
      ? await this.construirLineas(dto.items as LineaFacturaInput[], config)
      : null;
    const totales = lineas ? this.calcular(lineas) : null;

    // Resuelve el método de pago según el tipoPago final. undefined = sin cambio.
    const tipoFinal = dto.tipoPago ?? factura.tipoPago;
    let nuevoMetodo: string | null | undefined = undefined;
    if (tipoFinal === 'CREDITO') {
      // El crédito no lleva método en la factura (va por abono); se limpia.
      if (factura.metodoPago !== null) {
        nuevoMetodo = null;
      }
    } else if (dto.metodoPago !== undefined) {
      nuevoMetodo = this.resolverMetodoPago('CONTADO', dto.metodoPago);
    } else if (dto.tipoPago === 'CONTADO' && factura.tipoPago === 'CREDITO') {
      // Pasó a contado sin enviar método: exige uno (antes no tenía).
      nuevoMetodo = this.resolverMetodoPago('CONTADO', factura.metodoPago ?? undefined);
    }
    const cambiaMetodo = nuevoMetodo !== undefined && nuevoMetodo !== factura.metodoPago;

    // Bitácora: solo para EMITIDA, una fila por campo cambiado.
    const entradas: EntradaBitacora[] = [];
    if (emitida) {
      if (
        dto.clienteIdentidad !== undefined &&
        (dto.clienteIdentidad ?? null) !== factura.clienteIdentidad
      ) {
        entradas.push({
          campo: 'clienteIdentidad',
          valorAnterior: factura.clienteIdentidad,
          valorNuevo: dto.clienteIdentidad ?? null,
          motivo: dto.motivo,
        });
      }
      if (dto.tipoPago !== undefined && dto.tipoPago !== factura.tipoPago) {
        entradas.push({
          campo: 'tipoPago',
          valorAnterior: factura.tipoPago,
          valorNuevo: dto.tipoPago,
          motivo: dto.motivo,
        });
      }
      if (cambiaMetodo) {
        entradas.push({
          campo: 'metodoPago',
          valorAnterior: factura.metodoPago,
          valorNuevo: nuevoMetodo ?? null,
          motivo: dto.motivo,
        });
      }
      if (lineas && totales) {
        entradas.push({
          campo: 'detalles',
          valorAnterior: `${factura.detalles.length} líneas, total ${factura.total.toString()}`,
          valorNuevo: `${lineas.length} líneas, total ${totales.total}`,
          motivo: dto.motivo,
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.factura.update({
        where: { id },
        data: {
          clienteIdentidad:
            dto.clienteIdentidad !== undefined
              ? dto.clienteIdentidad ?? null
              : undefined,
          tipoPago: dto.tipoPago ?? undefined,
          metodoPago: nuevoMetodo,
          ...(totales
            ? {
                subtotal: totales.subtotal,
                impuesto: totales.impuesto,
                total: totales.total,
              }
            : {}),
        },
      });
      if (lineas) {
        await tx.facturaDetalle.deleteMany({ where: { facturaId: id } });
        await tx.facturaDetalle.createMany({
          data: lineas.map((l) => ({ facturaId: id, ...l })),
        });
      }
      await this.bitacora.registrar(tx, id, usuarioId, entradas);
    });
    return this.obtener(id);
  }

  /** Emite un borrador: lo congela, numera (si fiscal) y deja rastro. */
  async emitir(id: number, usuarioId: number): Promise<FacturaDto> {
    const factura = await this.prisma.factura.findUnique({
      where: { id },
      include: { detalles: true },
    });
    if (!factura) {
      throw new NotFoundException('Factura no encontrada.');
    }
    if (factura.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo un borrador se puede emitir.');
    }
    if (factura.detalles.length === 0) {
      throw new BadRequestException('La factura no tiene líneas.');
    }
    if (factura.tipoPago === 'CONTADO' && !factura.metodoPago) {
      throw new BadRequestException(
        'Una venta de contado requiere indicar el método de pago antes de emitir.',
      );
    }

    const config = await this.configuracion.obtener();
    // Recalcula totales desde el detalle actual (verdad al momento de emitir).
    const totales = this.calcular(
      factura.detalles.map((d) => ({
        productoId: d.productoId,
        nombreProducto: d.nombreProducto,
        precioUnitario: Number(d.precioUnitario),
        cantidad: Number(d.cantidad),
        tasaImpuesto: Number(d.tasaImpuesto),
      })),
    );

    // Campos fiscales: solo si la bandera está activa (hoy apagada).
    const fiscal = config.facturacionFiscalActiva
      ? {
          numero: String(id),
          cai: config.cai,
          caiRango: config.caiRango,
          caiFechaLimite: config.caiFechaLimite,
        }
      : {};

    await this.prisma.$transaction(async (tx) => {
      await tx.factura.update({
        where: { id },
        data: {
          estado: 'EMITIDA',
          emitidaEn: new Date(),
          subtotal: totales.subtotal,
          impuesto: totales.impuesto,
          total: totales.total,
          ...fiscal,
        },
      });
      await this.bitacora.registrar(tx, id, usuarioId, [
        { campo: 'estado', valorAnterior: 'BORRADOR', valorNuevo: 'EMITIDA' },
      ]);
    });
    return this.obtener(id);
  }

  /** Anula una factura (motivo obligatorio; deja rastro, no se borra). */
  async anular(
    id: number,
    dto: AnularFacturaDto,
    usuarioId: number,
  ): Promise<FacturaDto> {
    const factura = await this.prisma.factura.findUnique({ where: { id } });
    if (!factura) {
      throw new NotFoundException('Factura no encontrada.');
    }
    if (factura.estado === 'ANULADA') {
      throw new BadRequestException('La factura ya está anulada.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.factura.update({
        where: { id },
        data: { estado: 'ANULADA', motivoAnulacion: dto.motivo },
      });
      await this.bitacora.registrar(tx, id, usuarioId, [
        {
          campo: 'estado',
          valorAnterior: factura.estado,
          valorNuevo: 'ANULADA',
          motivo: dto.motivo,
        },
      ]);
    });
    return this.obtener(id);
  }

  /** Registra un abono (solo facturas de CRÉDITO emitidas; sin sobrepago). */
  async registrarAbono(
    id: number,
    dto: RegistrarAbonoDto,
    _usuarioId: number,
  ): Promise<FacturaDto> {
    const factura = await this.prisma.factura.findUnique({
      where: { id },
      include: { abonos: { select: { monto: true } } },
    });
    if (!factura) {
      throw new NotFoundException('Factura no encontrada.');
    }
    if (factura.estado !== 'EMITIDA') {
      throw new BadRequestException('Solo se abonan facturas emitidas.');
    }
    if (factura.tipoPago !== 'CREDITO') {
      throw new BadRequestException('Solo las facturas de crédito llevan abonos.');
    }
    const abonado = factura.abonos.reduce((s, a) => s + Number(a.monto), 0);
    const saldo = Number(factura.total) - abonado;
    if (saldo <= 0) {
      throw new BadRequestException('La factura ya está pagada.');
    }
    if (dto.monto > saldo + 1e-9) {
      throw new BadRequestException(
        `El abono (${dto.monto}) excede el saldo pendiente (${saldo.toFixed(2)}).`,
      );
    }
    await this.prisma.abono.create({
      data: {
        facturaId: id,
        monto: dto.monto,
        metodo: dto.metodo,
        fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
      },
    });
    return this.obtener(id);
  }

  // ---- helpers privados ----

  /**
   * Resuelve el método de pago a guardar según el tipo de pago. El crédito no
   * lleva método en la factura (va por abono) → null; el contado lo EXIGE.
   */
  private resolverMetodoPago(
    tipoPago: TipoPago,
    metodoPago?: string,
  ): string | null {
    if (tipoPago === 'CREDITO') {
      return null;
    }
    const metodo = metodoPago?.trim();
    if (!metodo) {
      throw new BadRequestException(
        'Una venta de contado requiere indicar el método de pago.',
      );
    }
    return metodo;
  }

  /** Si viene clienteIdentidad, valida que el cliente exista (error amable). */
  private async validarCliente(identidad?: string | null): Promise<void> {
    if (!identidad) {
      return;
    }
    const cliente = await this.prisma.cliente.findUnique({
      where: { identidad },
      select: { identidad: true },
    });
    if (!cliente) {
      throw new BadRequestException('El cliente indicado no existe.');
    }
  }

  /** Resuelve cada ítem a su línea con snapshot de nombre y precio vigente. */
  private async construirLineas(
    items: LineaFacturaInput[],
    config: Configuracion,
  ): Promise<LineaResuelta[]> {
    const tasaDefault = config.isvActivo ? Number(config.tasaIsv) : 0;
    const lineas: LineaResuelta[] = [];
    for (const it of items) {
      const producto = await this.prisma.producto.findUnique({
        where: { id: it.productoId },
      });
      if (!producto) {
        throw new NotFoundException(`Producto ${it.productoId} no encontrado.`);
      }
      if (!producto.activo) {
        throw new BadRequestException(`El producto "${producto.nombre}" está inactivo.`);
      }
      const precio = await this.prisma.precioProducto.findFirst({
        where: { productoId: it.productoId, vigenteHasta: null },
      });
      if (!precio) {
        throw new BadRequestException(
          `El producto "${producto.nombre}" no tiene precio vigente.`,
        );
      }
      lineas.push({
        productoId: it.productoId,
        nombreProducto: producto.nombre,
        precioUnitario: Number(precio.precio),
        cantidad: it.cantidad,
        tasaImpuesto: it.tasaImpuesto ?? tasaDefault,
      });
    }
    return lineas;
  }

  /** Aplica la estrategia de impuesto a las líneas → totales. */
  private calcular(lineas: LineaResuelta[]) {
    return this.impuesto.calcular(
      lineas.map((l) => ({
        precioUnitario: l.precioUnitario,
        cantidad: l.cantidad,
        tasaImpuesto: l.tasaImpuesto,
      })),
    );
  }
}
