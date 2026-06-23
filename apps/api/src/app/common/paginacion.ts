import {
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
  type Paginado,
  type QueryPaginado,
} from '@pane/shared';

/** Normaliza page/pageSize a límites seguros y calcula skip/take para Prisma. */
export function resolverPaginacion(q: QueryPaginado): {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
} {
  const page = q.page && q.page > 0 ? Math.floor(q.page) : 1;
  const pageSize =
    q.pageSize && q.pageSize > 0
      ? Math.min(Math.floor(q.pageSize), PAGE_SIZE_MAX)
      : PAGE_SIZE_DEFAULT;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** Arma la respuesta paginada. */
export function paginado<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginado<T> {
  return { items, total, page, pageSize };
}

/**
 * Filtro de rango de fechas (inclusive) para Prisma a partir de YYYY-MM-DD.
 * `hasta` cubre el día completo (hasta 23:59:59.999). Devuelve undefined si no
 * hay ningún extremo (para no añadir el filtro).
 */
export function rangoFechas(
  desde?: string,
  hasta?: string,
): { gte?: Date; lte?: Date } | undefined {
  if (!desde && !hasta) {
    return undefined;
  }
  const filtro: { gte?: Date; lte?: Date } = {};
  if (desde) {
    const d = new Date(`${desde}T00:00:00.000`);
    // Una fecha bien formada pero imposible (p. ej. 2026-13-99) se ignora en vez
    // de reventar la consulta; el formato lo valida el DTO (@Matches).
    if (!Number.isNaN(d.getTime())) filtro.gte = d;
  }
  if (hasta) {
    const h = new Date(`${hasta}T23:59:59.999`);
    if (!Number.isNaN(h.getTime())) filtro.lte = h;
  }
  return Object.keys(filtro).length ? filtro : undefined;
}
