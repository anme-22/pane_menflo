import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ReportesService } from './reportes.service';

describe('ReportesService', () => {
  let service: ReportesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReportesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('ventas hace GET a /reportes/ventas con desde/hasta', () => {
    service.ventas('2026-06-01', '2026-06-30').subscribe();
    const req = http.expectOne((r) => r.url === '/api/reportes/ventas');
    expect(req.request.params.get('desde')).toBe('2026-06-01');
    expect(req.request.params.get('hasta')).toBe('2026-06-30');
    req.flush({});
  });

  it('ventasDetalle hace GET a /reportes/ventas-detalle con desde/hasta', () => {
    service.ventasDetalle('2026-06-01', '2026-06-30').subscribe();
    const req = http.expectOne((r) => r.url === '/api/reportes/ventas-detalle');
    expect(req.request.params.get('desde')).toBe('2026-06-01');
    expect(req.request.params.get('hasta')).toBe('2026-06-30');
    req.flush({});
  });

  it('ganancia hace GET a /reportes/ganancia-por-producto', () => {
    service.gananciaPorProducto('2026-06-01', '2026-06-30').subscribe();
    const req = http.expectOne((r) => r.url === '/api/reportes/ganancia-por-producto');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('consumo hace GET a /reportes/consumo-insumos', () => {
    service.consumoInsumos('2026-06-01', '2026-06-30').subscribe();
    const req = http.expectOne((r) => r.url === '/api/reportes/consumo-insumos');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('cuentasPorCobrar hace GET a /reportes/cuentas-por-cobrar', () => {
    service.cuentasPorCobrar().subscribe();
    const req = http.expectOne('/api/reportes/cuentas-por-cobrar');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});
