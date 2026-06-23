import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService', () => {
  let service: UsuariosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UsuariosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crear envía identidad en el cuerpo', () => {
    service
      .crear({ nombre: 'Ana', email: 'ana@a.com', identidad: '0801199012345', password: 'clave1234', rol: 'vendedor' })
      .subscribe();
    const req = http.expectOne('/api/usuarios');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.identidad).toBe('0801199012345');
    req.flush({});
  });

  it('restablecerPassword hace PATCH a /usuarios/:id/password', () => {
    service.restablecerPassword(7).subscribe();
    const req = http.expectOne('/api/usuarios/7/password');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({});
    req.flush({ password: 'Temp123abc' });
  });
});
