import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import type { PrecioDto } from '@pane/shared';
import { ProductosService } from './productos.service';

describe('ProductosService', () => {
  let service: ProductosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('cambiarPrecio hace POST a /productos/:id/precio con el precio', () => {
    const respuesta: PrecioDto = {
      id: 9,
      precio: '15.50',
      vigenteDesde: '2026-01-01T00:00:00.000Z',
      vigenteHasta: null,
    };
    service.cambiarPrecio(3, 15.5).subscribe((r) => expect(r).toEqual(respuesta));

    const req = http.expectOne('/api/productos/3/precio');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ precio: 15.5 });
    req.flush(respuesta);
  });

  it('historial hace GET a /productos/:id/precios', () => {
    service.historial(3).subscribe();
    const req = http.expectOne('/api/productos/3/precios');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
