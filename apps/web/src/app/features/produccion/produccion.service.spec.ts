import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import type { CrearOrdenProduccionRequest } from '@pane/shared';
import { ProduccionService } from './produccion.service';

describe('ProduccionService', () => {
  let service: ProduccionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProduccionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crear hace POST a /produccion con producto y sacos', () => {
    const cuerpo: CrearOrdenProduccionRequest = { productoId: 3, sacos: 2 };
    service.crear(cuerpo).subscribe();
    const req = http.expectOne('/api/produccion');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(cuerpo);
    req.flush({});
  });

  it('confirmar hace POST a /produccion/:id/confirmar', () => {
    service.confirmar(7).subscribe();
    const req = http.expectOne('/api/produccion/7/confirmar');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('capturarBolsasReales hace PATCH a /produccion/:id/bolsas-reales', () => {
    service.capturarBolsasReales(7, { bolsasReales: 195 }).subscribe();
    const req = http.expectOne('/api/produccion/7/bolsas-reales');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ bolsasReales: 195 });
    req.flush({});
  });

  it('anular hace POST a /produccion/:id/anular con motivo', () => {
    service.anular(7, { motivo: 'error de captura' }).subscribe();
    const req = http.expectOne('/api/produccion/7/anular');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ motivo: 'error de captura' });
    req.flush({});
  });
});
