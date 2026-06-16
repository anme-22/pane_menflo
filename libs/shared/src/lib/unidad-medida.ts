/**
 * Tipos compartidos entre la API (Nest) y la web (Angular).
 * Son independientes de Prisma a propósito: el frontend NO puede importar el
 * cliente de Prisma, así que esta es la "fuente de verdad" común de los DTOs.
 */

/** Categoría de una unidad de medida (debe coincidir con el enum de Prisma). */
export type TipoUnidad = 'peso' | 'volumen' | 'conteo';

/** Unidad de medida tal como la consume el frontend. */
export interface UnidadMedida {
  id: number;
  nombre: string;
  abreviatura: string;
  tipo: TipoUnidad;
  /** Cuánto vale 1 de esta unidad en la unidad base de su tipo. */
  factorABase: number;
}
