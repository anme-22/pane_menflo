import type { Insumo, MovimientoInventario } from '@prisma/client';
import {
  ABREVIATURA_BASE,
  type MovimientoKardexDto,
  type StockDto,
  type TipoUnidad,
} from '@pane/shared';

const numero = new Intl.NumberFormat('es-HN', { maximumFractionDigits: 2 });

/**
 * Equivalente legible de una cantidad en unidad base: peso→g/kg, volumen→ml/L,
 * conteo→u. Solo es presentación; el dato exacto sigue en unidad base.
 */
export function equivalenteLegible(cantidadBase: number, tipo: TipoUnidad): string {
  if (tipo === 'peso') {
    return cantidadBase >= 1000
      ? `${numero.format(cantidadBase / 1000)} kg`
      : `${numero.format(cantidadBase)} g`;
  }
  if (tipo === 'volumen') {
    return cantidadBase >= 1000
      ? `${numero.format(cantidadBase / 1000)} L`
      : `${numero.format(cantidadBase)} ml`;
  }
  return `${numero.format(cantidadBase)} u`;
}

/** Existencia (saldo + costo) de un insumo en la sucursal por defecto. */
type SaldoInsumo = { cantidadBase: number; costoPromedio: number };

/** Mapea un insumo + su saldo al DTO de stock (con equivalente, valor y alerta). */
export function toStockDto(insumo: Insumo, saldo: SaldoInsumo): StockDto {
  const stockMinimo = Number(insumo.stockMinimo);
  return {
    insumoId: insumo.id,
    insumoNombre: insumo.nombre,
    tipo: insumo.tipo,
    activo: insumo.activo,
    cantidadBase: saldo.cantidadBase.toString(),
    unidadBaseAbrev: ABREVIATURA_BASE[insumo.tipo],
    equivalente: equivalenteLegible(saldo.cantidadBase, insumo.tipo),
    costoPromedio: saldo.costoPromedio.toString(),
    valor: (saldo.cantidadBase * saldo.costoPromedio).toString(),
    stockMinimo: insumo.stockMinimo.toString(),
    bajoStock: stockMinimo > 0 && saldo.cantidadBase < stockMinimo,
  };
}

/** Movimiento con sus relaciones para componer el origen. */
type MovimientoConOrigen = MovimientoInventario;

/** Texto de origen legible de un movimiento. */
export function origenMovimiento(m: MovimientoConOrigen): string {
  if (m.compraId) {
    return `Compra #${m.compraId}`;
  }
  if (m.ordenProduccionId) {
    return `Producción #${m.ordenProduccionId}`;
  }
  return 'Ajuste';
}

/** Mapea un movimiento al DTO del kardex, con el saldo acumulado ya calculado. */
export function toMovimientoKardexDto(
  m: MovimientoConOrigen,
  signo: 1 | -1,
  saldo: number,
): MovimientoKardexDto {
  return {
    id: m.id,
    fecha: m.fecha.toISOString(),
    tipo: m.tipo,
    origen: origenMovimiento(m),
    cantidadBase: m.cantidadBase.toString(),
    signo,
    costoUnitario: m.costoUnitario.toString(),
    saldo: saldo.toString(),
  };
}
