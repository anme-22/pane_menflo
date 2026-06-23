import { paginado, rangoFechas, resolverPaginacion } from './paginacion';

describe('paginación (helpers)', () => {
  it('resolverPaginacion: valores por defecto (page 1, pageSize 10)', () => {
    const r = resolverPaginacion({});
    expect(r).toEqual({ page: 1, pageSize: 10, skip: 0, take: 10 });
  });

  it('resolverPaginacion: calcula skip/take', () => {
    const r = resolverPaginacion({ page: 3, pageSize: 25 });
    expect(r).toEqual({ page: 3, pageSize: 25, skip: 50, take: 25 });
  });

  it('resolverPaginacion: acota el pageSize al máximo (100)', () => {
    expect(resolverPaginacion({ pageSize: 9999 }).pageSize).toBe(100);
  });

  it('resolverPaginacion: page/pageSize inválidos caen a los valores seguros', () => {
    const r = resolverPaginacion({ page: 0, pageSize: -5 });
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(10);
  });

  it('rangoFechas: sin extremos -> undefined', () => {
    expect(rangoFechas()).toBeUndefined();
  });

  it('rangoFechas: desde a las 00:00 y hasta cubre el día completo (hora local)', () => {
    const r = rangoFechas('2026-06-01', '2026-06-30');
    expect(r?.gte?.getDate()).toBe(1);
    expect(r?.gte?.getHours()).toBe(0);
    expect(r?.gte?.getMinutes()).toBe(0);
    expect(r?.lte?.getDate()).toBe(30);
    expect(r?.lte?.getHours()).toBe(23);
    expect(r?.lte?.getMinutes()).toBe(59);
  });

  it('paginado: arma la respuesta', () => {
    expect(paginado([1, 2], 7, 2, 2)).toEqual({
      items: [1, 2],
      total: 7,
      page: 2,
      pageSize: 2,
    });
  });
});
