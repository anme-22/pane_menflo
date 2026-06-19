import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Prisma, TipoMovimiento } from '@prisma/client';
import {
  ESTRATEGIA_COSTEO,
  EstrategiaCosteo,
  SaldoCosteo,
} from '../costeo/estrategia-costeo';

/** Datos para registrar una entrada de inventario (compra). */
export interface EntradaInventario {
  insumoId: number;
  sucursalId: number;
  /** Cantidad que ingresa, en unidad base. */
  cantidadBase: number;
  /** Costo TOTAL del lote (para el promedio ponderado). */
  costoTotal: number;
  /** Costo por unidad base del lote (se asienta en el movimiento). */
  costoUnitario: number;
  /** Origen del movimiento (compra que lo genera). */
  compraId: number;
  /** Fecha del movimiento (por defecto, ahora). */
  fecha?: Date;
}

/** Datos para registrar una salida de inventario (consumo). */
export interface SalidaInventario {
  insumoId: number;
  sucursalId: number;
  /** Cantidad a descontar, en unidad base. */
  cantidadBase: number;
  /** Origen del movimiento (orden de producción que lo genera). */
  ordenProduccionId: number;
  /** Fecha del movimiento (por defecto, ahora). */
  fecha?: Date;
}

/** Resultado de una salida ya aplicada. */
export interface SalidaAplicada {
  movimientoId: number;
  insumoId: number;
  cantidadBase: number;
  costoUnitario: number;
  costo: number;
}

/** Datos para revertir una salida (al anular una orden ya confirmada). */
export interface ReversionInventario {
  insumoId: number;
  sucursalId: number;
  /** Cantidad que se devuelve al stock, en unidad base. */
  cantidadBase: number;
  /** Costo al que salió; se reintegra al mismo valor. */
  costoUnitario: number;
  /** Orden cuya salida se está revirtiendo (origen del ajuste). */
  ordenProduccionId: number;
  /** Fecha del movimiento (por defecto, ahora). */
  fecha?: Date;
}

/** Datos para un ajuste manual de stock (conteo físico, merma de insumo…). */
export interface AjusteInventario {
  insumoId: number;
  sucursalId: number;
  /** true = suma al stock, false = resta. */
  incrementa: boolean;
  /** Cantidad a ajustar, en unidad base (positiva). */
  cantidadBase: number;
  /** Motivo (queda en el movimiento). */
  motivo: string;
  /** Fecha del movimiento (por defecto, ahora). */
  fecha?: Date;
}

/** Resultado de un ajuste ya aplicado (saldo nuevo en unidad base). */
export interface AjusteAplicado {
  movimientoId: number;
  saldoBase: number;
}

/**
 * Servicio de inventario (Feature 7; base para el kardex de la F8). Hoy expone
 * la SALIDA: descuenta el stock de un insumo y asienta un MovimientoInventario
 * inmutable (nunca se borra). Responsabilidad única (SOLID-S): produccion no
 * sabe de existencias ni de movimientos, solo pide "descuéntame esto".
 *
 * La salida se valora con la estrategia de costeo (DI, abierto/cerrado): en
 * promedio ponderado, al costo promedio vigente; el promedio no cambia al salir.
 *
 * Opera SIEMPRE dentro de una transacción del llamador (`tx`), para que el
 * descuento y el asiento sean atómicos junto con el resto de la confirmación.
 */
@Injectable()
export class InventarioService {
  constructor(
    @Inject(ESTRATEGIA_COSTEO) private readonly estrategia: EstrategiaCosteo,
  ) {}

  /**
   * Suma una entrada al stock (promedio ponderado vía la estrategia) y asienta
   * el movimiento de ENTRADA con origen la compra. Centraliza la mutación de
   * inventario: ComprasService delega aquí en lugar de tocar `existencia`.
   */
  async registrarEntrada(
    tx: Prisma.TransactionClient,
    entrada: EntradaInventario,
  ): Promise<number> {
    const existente = await tx.existencia.findUnique({
      where: {
        insumoId_sucursalId: {
          insumoId: entrada.insumoId,
          sucursalId: entrada.sucursalId,
        },
      },
    });
    const saldo: SaldoCosteo = existente
      ? {
          cantidadBase: Number(existente.cantidadBase),
          costoPromedio: Number(existente.costoPromedio),
        }
      : { cantidadBase: 0, costoPromedio: 0 };

    const nuevo = this.estrategia.aplicarEntrada(saldo, {
      cantidadBase: entrada.cantidadBase,
      costoTotal: entrada.costoTotal,
    });

    await tx.existencia.upsert({
      where: {
        insumoId_sucursalId: {
          insumoId: entrada.insumoId,
          sucursalId: entrada.sucursalId,
        },
      },
      create: {
        insumoId: entrada.insumoId,
        sucursalId: entrada.sucursalId,
        cantidadBase: nuevo.cantidadBase,
        costoPromedio: nuevo.costoPromedio,
      },
      update: {
        cantidadBase: nuevo.cantidadBase,
        costoPromedio: nuevo.costoPromedio,
      },
    });

    const movimiento = await tx.movimientoInventario.create({
      data: {
        insumoId: entrada.insumoId,
        sucursalId: entrada.sucursalId,
        tipo: TipoMovimiento.ENTRADA,
        cantidadBase: entrada.cantidadBase,
        costoUnitario: entrada.costoUnitario,
        compraId: entrada.compraId,
        fecha: entrada.fecha ?? new Date(),
      },
    });
    return movimiento.id;
  }

  /**
   * Descuenta `cantidadBase` del insumo en la sucursal dada y registra el
   * movimiento de salida. Lanza 400 si no hay existencia o stock suficiente.
   */
  async registrarSalida(
    tx: Prisma.TransactionClient,
    salida: SalidaInventario,
    nombreInsumo?: string,
  ): Promise<SalidaAplicada> {
    const etiqueta = nombreInsumo ?? `insumo ${salida.insumoId}`;
    if (salida.cantidadBase <= 0) {
      throw new BadRequestException(
        `La cantidad a consumir de ${etiqueta} debe ser mayor que 0.`,
      );
    }

    const existencia = await tx.existencia.findUnique({
      where: {
        insumoId_sucursalId: {
          insumoId: salida.insumoId,
          sucursalId: salida.sucursalId,
        },
      },
    });
    const saldo: SaldoCosteo = existencia
      ? {
          cantidadBase: Number(existencia.cantidadBase),
          costoPromedio: Number(existencia.costoPromedio),
        }
      : { cantidadBase: 0, costoPromedio: 0 };

    if (saldo.cantidadBase < salida.cantidadBase) {
      throw new BadRequestException(
        `Stock insuficiente de ${etiqueta}: se requieren ${salida.cantidadBase} y hay ${saldo.cantidadBase} (unidad base).`,
      );
    }

    const resultado = this.estrategia.valorarSalida(saldo, {
      cantidadBase: salida.cantidadBase,
    });

    await tx.existencia.update({
      where: {
        insumoId_sucursalId: {
          insumoId: salida.insumoId,
          sucursalId: salida.sucursalId,
        },
      },
      data: {
        cantidadBase: resultado.saldo.cantidadBase,
        costoPromedio: resultado.saldo.costoPromedio,
      },
    });

    const movimiento = await tx.movimientoInventario.create({
      data: {
        insumoId: salida.insumoId,
        sucursalId: salida.sucursalId,
        tipo: TipoMovimiento.SALIDA,
        cantidadBase: salida.cantidadBase,
        costoUnitario: resultado.costoUnitario,
        ordenProduccionId: salida.ordenProduccionId,
        fecha: salida.fecha ?? new Date(),
      },
    });

    return {
      movimientoId: movimiento.id,
      insumoId: salida.insumoId,
      cantidadBase: salida.cantidadBase,
      costoUnitario: resultado.costoUnitario,
      costo: resultado.costo,
    };
  }

  /**
   * Devuelve stock al anular una orden ya confirmada: es el INVERSO de
   * registrarSalida. Suma la cantidad de vuelta (promedio ponderado, valorada al
   * costo al que salió) y asienta un AJUSTE positivo con origen la orden. Si no
   * hubo compras intermedias, el saldo y el promedio vuelven a su valor original.
   * Opera dentro de la transacción del llamador (atómico con el cambio de estado).
   */
  async revertirSalida(
    tx: Prisma.TransactionClient,
    reversion: ReversionInventario,
  ): Promise<number> {
    const existente = await tx.existencia.findUnique({
      where: {
        insumoId_sucursalId: {
          insumoId: reversion.insumoId,
          sucursalId: reversion.sucursalId,
        },
      },
    });
    const saldo: SaldoCosteo = existente
      ? {
          cantidadBase: Number(existente.cantidadBase),
          costoPromedio: Number(existente.costoPromedio),
        }
      : { cantidadBase: 0, costoPromedio: 0 };

    const nuevo = this.estrategia.aplicarEntrada(saldo, {
      cantidadBase: reversion.cantidadBase,
      costoTotal: reversion.cantidadBase * reversion.costoUnitario,
    });

    await tx.existencia.upsert({
      where: {
        insumoId_sucursalId: {
          insumoId: reversion.insumoId,
          sucursalId: reversion.sucursalId,
        },
      },
      create: {
        insumoId: reversion.insumoId,
        sucursalId: reversion.sucursalId,
        cantidadBase: nuevo.cantidadBase,
        costoPromedio: nuevo.costoPromedio,
      },
      update: {
        cantidadBase: nuevo.cantidadBase,
        costoPromedio: nuevo.costoPromedio,
      },
    });

    const movimiento = await tx.movimientoInventario.create({
      data: {
        insumoId: reversion.insumoId,
        sucursalId: reversion.sucursalId,
        tipo: TipoMovimiento.AJUSTE,
        cantidadBase: reversion.cantidadBase,
        costoUnitario: reversion.costoUnitario,
        ordenProduccionId: reversion.ordenProduccionId,
        fecha: reversion.fecha ?? new Date(),
      },
    });
    return movimiento.id;
  }

  /**
   * Ajuste manual de stock (conteo físico, merma de insumo, regalo…). Suma o
   * resta `cantidadBase` y asienta un AJUSTE con motivo y dirección. La salida y
   * la entrada se valoran al costo promedio vigente, así que el promedio NO
   * cambia (un ajuste no aporta nueva información de costo). Lanza 400 si una
   * disminución deja el stock negativo. Opera en la transacción del llamador.
   */
  async registrarAjuste(
    tx: Prisma.TransactionClient,
    ajuste: AjusteInventario,
  ): Promise<AjusteAplicado> {
    if (ajuste.cantidadBase <= 0) {
      throw new BadRequestException('La cantidad del ajuste debe ser mayor que 0.');
    }

    const existente = await tx.existencia.findUnique({
      where: {
        insumoId_sucursalId: {
          insumoId: ajuste.insumoId,
          sucursalId: ajuste.sucursalId,
        },
      },
    });
    const saldo: SaldoCosteo = existente
      ? {
          cantidadBase: Number(existente.cantidadBase),
          costoPromedio: Number(existente.costoPromedio),
        }
      : { cantidadBase: 0, costoPromedio: 0 };

    let nuevo: SaldoCosteo;
    let costoUnitario: number;
    if (ajuste.incrementa) {
      // Entra al costo promedio vigente: el promedio no cambia.
      nuevo = this.estrategia.aplicarEntrada(saldo, {
        cantidadBase: ajuste.cantidadBase,
        costoTotal: ajuste.cantidadBase * saldo.costoPromedio,
      });
      costoUnitario = saldo.costoPromedio;
    } else {
      if (saldo.cantidadBase < ajuste.cantidadBase) {
        throw new BadRequestException(
          `Stock insuficiente para disminuir: hay ${saldo.cantidadBase} y se quitan ${ajuste.cantidadBase} (unidad base).`,
        );
      }
      const resultado = this.estrategia.valorarSalida(saldo, {
        cantidadBase: ajuste.cantidadBase,
      });
      nuevo = resultado.saldo;
      costoUnitario = resultado.costoUnitario;
    }

    await tx.existencia.upsert({
      where: {
        insumoId_sucursalId: {
          insumoId: ajuste.insumoId,
          sucursalId: ajuste.sucursalId,
        },
      },
      create: {
        insumoId: ajuste.insumoId,
        sucursalId: ajuste.sucursalId,
        cantidadBase: nuevo.cantidadBase,
        costoPromedio: nuevo.costoPromedio,
      },
      update: {
        cantidadBase: nuevo.cantidadBase,
        costoPromedio: nuevo.costoPromedio,
      },
    });

    const movimiento = await tx.movimientoInventario.create({
      data: {
        insumoId: ajuste.insumoId,
        sucursalId: ajuste.sucursalId,
        tipo: TipoMovimiento.AJUSTE,
        cantidadBase: ajuste.cantidadBase,
        costoUnitario,
        motivo: ajuste.motivo,
        incrementa: ajuste.incrementa,
        fecha: ajuste.fecha ?? new Date(),
      },
    });

    return { movimientoId: movimiento.id, saldoBase: nuevo.cantidadBase };
  }
}
