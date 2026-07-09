import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import type { CrearFacturaRequest } from '@pane/shared';
import { FacturasService } from './facturas.service';

describe('FacturasService', () => {
  let service: FacturasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FacturasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crear hace POST a /facturas con cliente, tipoPago e items', () => {
    const cuerpo: CrearFacturaRequest = {
      clienteIdentidad: null,
      tipoPago: 'CONTADO',
      items: [{ productoId: 1, cantidad: 2 }],
    };
    service.crear(cuerpo).subscribe();
    const req = http.expectOne('/api/facturas');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(cuerpo);
    req.flush({});
  });

  it('emitir hace POST a /facturas/:id/emitir', () => {
    service.emitir(7).subscribe();
    const req = http.expectOne('/api/facturas/7/emitir');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('anular hace POST a /facturas/:id/anular con motivo', () => {
    service.anular(7, { motivo: 'error' }).subscribe();
    const req = http.expectOne('/api/facturas/7/anular');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ motivo: 'error' });
    req.flush({});
  });

  it('registrarAbono hace POST a /facturas/:id/abonos', () => {
    service.registrarAbono(7, { monto: 50, metodo: 'Efectivo' }).subscribe();
    const req = http.expectOne('/api/facturas/7/abonos');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('negocio hace GET a /configuracion/negocio (datos del ticket)', () => {
    service.negocio().subscribe();
    const req = http.expectOne('/api/configuracion/negocio');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});
