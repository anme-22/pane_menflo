import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Una entrada de bitácora (cambio de un campo, con motivo opcional). */
export interface EntradaBitacora {
  campo: string;
  valorAnterior?: string | null;
  valorNuevo?: string | null;
  motivo?: string | null;
}

/**
 * Escribe el rastro (bitácora) de una factura. Responsabilidad única (SOLID-S):
 * FacturasService le pasa qué cambió y quién, dentro de su transacción. La
 * bitácora es inmutable (nunca se borra).
 */
@Injectable()
export class BitacoraService {
  async registrar(
    tx: Prisma.TransactionClient,
    facturaId: number,
    usuarioId: number,
    entradas: EntradaBitacora[],
  ): Promise<void> {
    if (entradas.length === 0) {
      return;
    }
    await tx.facturaBitacora.createMany({
      data: entradas.map((e) => ({
        facturaId,
        usuarioId,
        campo: e.campo,
        valorAnterior: e.valorAnterior ?? null,
        valorNuevo: e.valorNuevo ?? null,
        motivo: e.motivo ?? null,
      })),
    });
  }
}
