import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import type { InsumoDto } from '@pane/shared';
import { InsumosService } from './insumos.service';

describe('InsumosService', () => {
  let service: InsumosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InsumosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crear hace POST a /insumos con nombre y tipo', () => {
    const cuerpo = { nombre: 'Harina', tipo: 'peso' as const };
    const creado: InsumoDto = {
      id: 1,
      nombre: 'Harina',
      tipo: 'peso',
      activo: true,
      existencia: { cantidadBase: '0', costoPromedio: '0' },
      creadoEn: '2026-01-01T00:00:00.000Z',
      actualizadoEn: '2026-01-01T00:00:00.000Z',
    };
    service.crear(cuerpo).subscribe((r) => expect(r).toEqual(creado));

    const req = http.expectOne('/api/insumos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(cuerpo);
    req.flush(creado);
  });

  it('cambiarEstado hace PATCH a /insumos/:id/estado', () => {
    service.cambiarEstado(1, false).subscribe();
    const req = http.expectOne('/api/insumos/1/estado');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ activo: false });
    req.flush({});
  });
});
