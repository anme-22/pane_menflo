import { Injectable } from '@nestjs/common';
import {
  EstrategiaImpuesto,
  LineaImpuesto,
  TotalesFactura,
} from './estrategia-impuesto';

/** Redondeo a 2 decimales (céntimos). */
const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Impuesto por línea: subtotal_linea = precio × cantidad; impuesto_linea =
 * subtotal_linea × tasa; total = subtotal + impuesto. Redondea cada línea a
 * céntimos y suma (evita el arrastre de fracciones). Con tasa 0 el impuesto es 0.
 */
@Injectable()
export class ImpuestoPorLineaStrategy implements EstrategiaImpuesto {
  calcular(lineas: LineaImpuesto[]): TotalesFactura {
    const porLinea = lineas.map((l) => {
      const subtotal = r2(l.precioUnitario * l.cantidad);
      const impuesto = r2(subtotal * l.tasaImpuesto);
      return { subtotal, impuesto, total: r2(subtotal + impuesto) };
    });
    const subtotal = r2(porLinea.reduce((s, l) => s + l.subtotal, 0));
    const impuesto = r2(porLinea.reduce((s, l) => s + l.impuesto, 0));
    return { subtotal, impuesto, total: r2(subtotal + impuesto), porLinea };
  }
}
