import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import type { CompraDto, CrearCompraRequest } from '@pane/shared';
import { ComprasService } from './compras.service';

describe('ComprasService', () => {
  let service: ComprasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ComprasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crear hace POST a /compras con el cuerpo de la compra', () => {
    const cuerpo: CrearCompraRequest = {
      insumoId: 1,
      unidadCompraId: 4,
      cantidad: 2,
      costo: 6000,
    };
    const creada: CompraDto = {
      id: 10,
      insumoId: 1,
      insumoNombre: 'Harina',
      fecha: '2026-06-17T00:00:00.000Z',
      cantidadCompra: '2',
      unidadCompraId: 4,
      unidadCompraAbrev: 'qq',
      costo: '6000',
      cantidadBase: '90718.4',
      costoPorUnidadBase: '0.066138',
    };
    service.crear(cuerpo).subscribe((r) => expect(r).toEqual(creada));

    const req = http.expectOne('/api/compras');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(cuerpo);
    req.flush(creada);
  });

  it('listar hace GET a /compras', () => {
    service.listar().subscribe();
    const req = http.expectOne('/api/compras');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
