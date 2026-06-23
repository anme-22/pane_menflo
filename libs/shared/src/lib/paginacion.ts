/**
 * Contratos de paginación en SERVIDOR, compartidos entre API y web.
 * La API recibe `page`/`pageSize` (+ filtros por pantalla) y devuelve la página
 * pedida junto con el total, para que las tablas paginen sin traerse todo.
 */

/** Tamaño de página por defecto y máximo permitido. */
export const PAGE_SIZE_DEFAULT = 10;
export const PAGE_SIZE_MAX = 100;

/** Parámetros base de paginación (1-based). */
export interface QueryPaginado {
  /** Página solicitada (1 = primera). */
  page?: number;
  /** Tamaño de página (acotado a PAGE_SIZE_MAX en el servidor). */
  pageSize?: number;
}

/** Respuesta paginada genérica. */
export interface Paginado<T> {
  items: T[];
  /** Total de registros que casan el filtro (no solo los de la página). */
  total: number;
  page: number;
  pageSize: number;
}
