import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProveedoresService } from './proveedores.service';

describe('ProveedoresService', () => {
  let service: ProveedoresService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProveedoresService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar hace GET a /proveedores', () => {
    service.listar().subscribe();
    const req = http.expectOne('/api/proveedores');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('crear hace POST a /proveedores con el cuerpo', () => {
    service.crear({ nombre: 'Molinos', telefono: '2200-0000' }).subscribe();
    const req = http.expectOne('/api/proveedores');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Molinos', telefono: '2200-0000' });
    req.flush({});
  });

  it('cambiarEstado hace PATCH a /proveedores/:id/estado', () => {
    service.cambiarEstado(3, false).subscribe();
    const req = http.expectOne('/api/proveedores/3/estado');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ activo: false });
    req.flush({});
  });
});
