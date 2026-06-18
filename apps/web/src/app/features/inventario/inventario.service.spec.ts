import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import type { CoberturaRequest } from '@pane/shared';
import { InventarioService } from './inventario.service';

describe('InventarioService', () => {
  let service: InventarioService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InventarioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('existencias hace GET a /inventario/existencias', () => {
    service.existencias().subscribe();
    const req = http.expectOne('/api/inventario/existencias');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('kardex hace GET a /inventario/kardex/:id', () => {
    service.kardex(5).subscribe();
    const req = http.expectOne('/api/inventario/kardex/5');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('cobertura hace POST a /inventario/cobertura', () => {
    const cuerpo: CoberturaRequest = { productoId: 3, sacosPorDia: 2 };
    service.cobertura(cuerpo).subscribe();
    const req = http.expectOne('/api/inventario/cobertura');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(cuerpo);
    req.flush({});
  });

  it('alertas hace GET a /inventario/alertas', () => {
    service.alertas().subscribe();
    const req = http.expectOne('/api/inventario/alertas');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
