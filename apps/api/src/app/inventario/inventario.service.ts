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
}
