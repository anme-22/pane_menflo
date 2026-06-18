import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import type { CrearRecetaRequest } from '@pane/shared';
import { RecetasService } from './recetas.service';

describe('RecetasService', () => {
  let service: RecetasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RecetasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crear hace POST a /recetas con producto, rendimiento e ingredientes', () => {
    const cuerpo: CrearRecetaRequest = {
      productoId: 1,
      rendimiento: 223,
      unidadLote: 'quintal',
      ingredientes: [{ insumoId: 10, cantidad: 1, unidadId: 5 }],
    };
    service.crear(cuerpo).subscribe();
    const req = http.expectOne('/api/recetas');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(cuerpo);
    req.flush({});
  });

  it('obtenerPorProducto hace GET a /recetas/producto/:id', () => {
    service.obtenerPorProducto(1).subscribe();
    const req = http.expectOne('/api/recetas/producto/1');
    expect(req.request.method).toBe('GET');
    req.flush(null);
  });

  it('eliminar hace DELETE a /recetas/:id', () => {
    service.eliminar(7).subscribe();
    const req = http.expectOne('/api/recetas/7');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
