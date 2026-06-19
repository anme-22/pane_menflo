import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import type { CrearCostoIndirectoRequest } from '@pane/shared';
import { CostosIndirectosService } from './costos-indirectos.service';

describe('CostosIndirectosService', () => {
  let service: CostosIndirectosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CostosIndirectosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crear hace POST a /costos-indirectos', () => {
    const cuerpo: CrearCostoIndirectoRequest = { nombre: 'Mano de obra', monto: 350, tipo: 'POR_QUINTAL' };
    service.crear(cuerpo).subscribe();
    const req = http.expectOne('/api/costos-indirectos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(cuerpo);
    req.flush({});
  });

  it('actualizarParametros hace PATCH a /costos-indirectos/parametros', () => {
    service.actualizarParametros({ quintalesPorMes: 100 }).subscribe();
    const req = http.expectOne('/api/costos-indirectos/parametros');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ quintalesPorMes: 100 });
    req.flush({});
  });

  it('cambiarEstado hace PATCH a /costos-indirectos/:id/estado', () => {
    service.cambiarEstado(3, false).subscribe();
    const req = http.expectOne('/api/costos-indirectos/3/estado');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ activo: false });
    req.flush({});
  });
});
