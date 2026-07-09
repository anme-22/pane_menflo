import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ABREVIATURA_BASE,
  type ConsumoInsumosReporteDto,
  type CuentasPorCobrarReporteDto,
  type FacturaVentaDto,
  type GananciaProductoDto,
  type GananciaReporteDto,
  type VentasDetalladasReporteDto,
  type VentasReporteDto,
} from '@pane/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CostoRecetaService } from '../recetas/costo-receta.service';
import { calcularPago } from '../facturas/calculo-pago';

/** Rango de fechas resuelto a timestamps (inclusivo). */
interface Rango {
  desde: string;
  hasta: string;
  gte: Date;
  lte: Date;
}

const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Reportes (SOLID-S, solo lectura). Consulta facturas (F9) y movimientos (F7);
 * reutiliza CostoRecetaService (costo por bolsa) y calcularPago (saldos). No
 * duplica lógica de costeo ni de pago.
 */
@Injectable()
export class ReportesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly costoReceta: CostoRecetaService,
  ) {}

  /** Ventas por periodo: resumen + desglose por día (solo facturas EMITIDA). */
  async ventas(desde?: string, hasta?: string): Promise<VentasReporteDto> {
    const r = this.rango(desde, hasta);
    const facturas = await this.prisma.factura.findMany({
      where: { estado: 'EMITIDA', fecha: { gte: r.gte, lte: r.lte } },
      select: { fecha: true, subtotal: true, impuesto: true, total: true },
      orderBy: { fecha: 'asc' },
    });

    let subtotal = 0;
    let impuesto = 0;
    let total = 0;
    const porDiaMap = new Map<string, { numFacturas: number; total: number }>();
    for (const f of facturas) {
      subtotal += Number(f.subtotal);
      impuesto += Number(f.impuesto);
      total += Number(f.total);
      const dia = f.fecha.toISOString().slice(0, 10);
      const acc = porDiaMap.get(dia) ?? { numFacturas: 0, total: 0 };
      acc.numFacturas += 1;
      acc.total += Number(f.total);
      porDiaMap.set(dia, acc);
    }

    return {
      desde: r.desde,
      hasta: r.hasta,
      numFacturas: facturas.length,
      subtotal: r2(subtotal).toString(),
      impuesto: r2(impuesto).toString(),
      total: r2(total).toString(),
      porDia: [...porDiaMap.entries()].map(([fecha, v]) => ({
        fecha,
        numFacturas: v.numFacturas,
        total: r2(v.total).toString(),
      })),
    };
  }

  /**
   * Ventas detalladas del periodo (libro de ventas): por día → factura (con
   * cliente) → líneas de producto (cantidad, precio, total). Solo facturas
   * EMITIDA. El total de cada línea de cortesía es 0 (no cobra) y el total del
   * día = Σ de los totales de sus facturas (que ya excluyen cortesías).
   */
  async ventasDetalladas(
    desde?: string,
    hasta?: string,
  ): Promise<VentasDetalladasReporteDto> {
    const r = this.rango(desde, hasta);
    const facturas = await this.prisma.factura.findMany({
      where: { estado: 'EMITIDA', fecha: { gte: r.gte, lte: r.lte } },
      include: {
        cliente: true,
        detalles: {
          select: {
            productoId: true,
            nombreProducto: true,
            cantidad: true,
            precioUnitario: true,
            esCortesia: true,
          },
        },
      },
      orderBy: { fecha: 'asc' },
    });

    // Agrupa por día conservando el orden cronológico.
    const porDia = new Map<string, { facturas: FacturaVentaDto[]; total: number }>();
    let totalGeneral = 0;
    for (const f of facturas) {
      const facturaDto: FacturaVentaDto = {
        facturaId: f.id,
        numero: f.numero,
        fecha: f.fecha.toISOString(),
        clienteNombre: f.cliente
          ? `${f.cliente.nombre} ${f.cliente.apellido}`.trim()
          : null,
        tipoPago: f.tipoPago,
        lineas: f.detalles.map((d) => {
          const totalLinea = d.esCortesia
            ? 0
            : Number(d.precioUnitario) * Number(d.cantidad);
          return {
            productoId: d.productoId,
            nombreProducto: d.nombreProducto,
            cantidad: Number(d.cantidad).toString(),
            precioUnitario: Number(d.precioUnitario).toString(),
            totalLinea: r2(totalLinea).toString(),
            esCortesia: d.esCortesia,
          };
        }),
        total: Number(f.total).toString(),
      };
      const dia = f.fecha.toISOString().slice(0, 10);
      const acc = porDia.get(dia) ?? { facturas: [], total: 0 };
      acc.facturas.push(facturaDto);
      acc.total += Number(f.total);
      porDia.set(dia, acc);
      totalGeneral += Number(f.total);
    }

    return {
      desde: r.desde,
      hasta: r.hasta,
      dias: [...porDia.entries()].map(([fecha, v]) => ({
        fecha,
        facturas: v.facturas,
        numFacturas: v.facturas.length,
        total: r2(v.total).toString(),
      })),
      numFacturas: facturas.length,
      total: r2(totalGeneral).toString(),
    };
  }

  /**
   * Ganancia por producto del periodo. Ingreso = Σ (precio de la factura ×
   * cantidad) (snapshot). Costo = costo por bolsa actual × cantidad (vía
   * CostoRecetaService). Productos sin receta van sin costeo (ganancia = ingreso).
   */
  async gananciaPorProducto(
    desde?: string,
    hasta?: string,
  ): Promise<GananciaReporteDto> {
    const r = this.rango(desde, hasta);
    const detalles = await this.prisma.facturaDetalle.findMany({
      where: { factura: { estado: 'EMITIDA', fecha: { gte: r.gte, lte: r.lte } } },
      select: {
        productoId: true,
        nombreProducto: true,
        precioUnitario: true,
        cantidad: true,
      },
    });

    // Agrega por producto: cantidad e ingreso (snapshot).
    const acc = new Map<
      number,
      { nombre: string; cantidad: number; ingreso: number }
    >();
    for (const d of detalles) {
      const cantidad = Number(d.cantidad);
      const ingreso = Number(d.precioUnitario) * cantidad;
      const prev = acc.get(d.productoId);
      if (prev) {
        prev.cantidad += cantidad;
        prev.ingreso += ingreso;
      } else {
        acc.set(d.productoId, { nombre: d.nombreProducto, cantidad, ingreso });
      }
    }

    const productos: GananciaProductoDto[] = [];
    let ingresoTotal = 0;
    let costoTotalAcc = 0;
    let gananciaTotal = 0;
    for (const [productoId, v] of acc) {
      const costoUnitario = await this.costoPorBolsa(productoId);
      const conCosteo = costoUnitario !== null;
      const costoTotal = conCosteo ? r2(costoUnitario * v.cantidad) : null;
      const ganancia = r2(v.ingreso - (costoTotal ?? 0));
      productos.push({
        productoId,
        nombreProducto: v.nombre,
        cantidadVendida: r2(v.cantidad).toString(),
        ingreso: r2(v.ingreso).toString(),
        costoUnitario: conCosteo ? r2(costoUnitario as number).toString() : null,
        costoTotal: costoTotal === null ? null : costoTotal.toString(),
        ganancia: ganancia.toString(),
        conCosteo,
      });
      ingresoTotal += v.ingreso;
      costoTotalAcc += costoTotal ?? 0;
      gananciaTotal += ganancia;
    }
    productos.sort((a, b) => Number(b.ganancia) - Number(a.ganancia));

    return {
      desde: r.desde,
      hasta: r.hasta,
      productos,
      ingresoTotal: r2(ingresoTotal).toString(),
      costoTotal: r2(costoTotalAcc).toString(),
      gananciaTotal: r2(gananciaTotal).toString(),
    };
  }

  /** Consumo de insumos del periodo (salidas de producción), por insumo. */
  async consumoInsumos(
    desde?: string,
    hasta?: string,
  ): Promise<ConsumoInsumosReporteDto> {
    const r = this.rango(desde, hasta);
    const movimientos = await this.prisma.movimientoInventario.findMany({
      where: { tipo: 'SALIDA', fecha: { gte: r.gte, lte: r.lte } },
      include: { insumo: true },
    });

    const acc = new Map<
      number,
      { nombre: string; tipo: 'peso' | 'volumen' | 'conteo'; cantidad: number; costo: number }
    >();
    for (const m of movimientos) {
      const cantidad = Number(m.cantidadBase);
      const costo = cantidad * Number(m.costoUnitario);
      const prev = acc.get(m.insumoId);
      if (prev) {
        prev.cantidad += cantidad;
        prev.costo += costo;
      } else {
        acc.set(m.insumoId, {
          nombre: m.insumo.nombre,
          tipo: m.insumo.tipo,
          cantidad,
          costo,
        });
      }
    }

    let costoTotal = 0;
    const insumos = [...acc.entries()].map(([insumoId, v]) => {
      costoTotal += v.costo;
      return {
        insumoId,
        insumoNombre: v.nombre,
        unidadBaseAbrev: ABREVIATURA_BASE[v.tipo],
        cantidadBase: r2(v.cantidad).toString(),
        costo: r2(v.costo).toString(),
      };
    });
    insumos.sort((a, b) => Number(b.costo) - Number(a.costo));

    return { desde: r.desde, hasta: r.hasta, insumos, costoTotal: r2(costoTotal).toString() };
  }

  /** Cuentas por cobrar: facturas de crédito EMITIDA con saldo pendiente. */
  async cuentasPorCobrar(): Promise<CuentasPorCobrarReporteDto> {
    const facturas = await this.prisma.factura.findMany({
      where: { tipoPago: 'CREDITO', estado: 'EMITIDA' },
      include: { cliente: true, abonos: { select: { monto: true } } },
      orderBy: { fecha: 'asc' },
    });

    const cuentas = [];
    let totalPorCobrar = 0;
    for (const f of facturas) {
      const pago = calcularPago(
        Number(f.total),
        'CREDITO',
        'EMITIDA',
        f.abonos.map((a) => Number(a.monto)),
      );
      if (pago.saldoPendiente <= 0) {
        continue;
      }
      totalPorCobrar += pago.saldoPendiente;
      cuentas.push({
        facturaId: f.id,
        numero: f.numero,
        fecha: f.fecha.toISOString(),
        clienteNombre: f.cliente
          ? `${f.cliente.nombre} ${f.cliente.apellido}`.trim()
          : null,
        total: f.total.toString(),
        abonado: pago.totalAbonado.toString(),
        saldo: pago.saldoPendiente.toString(),
      });
    }

    return { cuentas, totalPorCobrar: r2(totalPorCobrar).toString() };
  }

  // ---- helpers privados ----

  /** Costo por bolsa actual del producto (o null si no tiene receta). */
  private async costoPorBolsa(productoId: number): Promise<number | null> {
    const receta = await this.prisma.receta.findUnique({
      where: { productoId },
      include: { ingredientes: true },
    });
    if (!receta) {
      return null;
    }
    const { costoPorBolsa } = await this.costoReceta.calcular(receta);
    return costoPorBolsa;
  }

  /** Valida y resuelve el rango de fechas (YYYY-MM-DD, inclusivo). */
  private rango(desde?: string, hasta?: string): Rango {
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (!desde || !hasta || !re.test(desde) || !re.test(hasta)) {
      throw new BadRequestException('Indica "desde" y "hasta" en formato YYYY-MM-DD.');
    }
    const gte = new Date(`${desde}T00:00:00.000`);
    const lte = new Date(`${hasta}T23:59:59.999`);
    if (Number.isNaN(gte.getTime()) || Number.isNaN(lte.getTime())) {
      throw new BadRequestException('Fechas inválidas.');
    }
    if (gte > lte) {
      throw new BadRequestException('La fecha inicial no puede ser mayor que la final.');
    }
    return { desde, hasta, gte, lte };
  }
}
