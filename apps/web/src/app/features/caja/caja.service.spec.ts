import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CajaService } from './caja.service';

describe('CajaService', () => {
  let service: CajaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CajaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('actual hace GET a /caja/actual', () => {
    service.actual().subscribe();
    const req = http.expectOne('/api/caja/actual');
    expect(req.request.method).toBe('GET');
    req.flush(null);
  });

  it('abrir hace POST a /caja/abrir con el fondo', () => {
    service.abrir({ montoInicial: 500 }).subscribe();
    const req = http.expectOne('/api/caja/abrir');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ montoInicial: 500 });
    req.flush({});
  });

  it('registrarMovimiento hace POST a /caja/:id/movimientos', () => {
    service.registrarMovimiento(7, { tipo: 'EGRESO', monto: 100, concepto: 'Retiro' }).subscribe();
    const req = http.expectOne('/api/caja/7/movimientos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ tipo: 'EGRESO', monto: 100, concepto: 'Retiro' });
    req.flush({});
  });

  it('cerrar hace POST a /caja/:id/cerrar con el conteo', () => {
    service.cerrar(7, { montoContado: 720 }).subscribe();
    const req = http.expectOne('/api/caja/7/cerrar');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ montoContado: 720 });
    req.flush({});
  });
});
