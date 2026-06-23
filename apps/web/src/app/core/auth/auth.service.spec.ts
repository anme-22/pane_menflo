import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import type { LoginResponse } from '@pane/shared';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('arranca sin sesión', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.usuario()).toBeNull();
  });

  it('guarda token y usuario al hacer login', () => {
    const respuesta: LoginResponse = {
      accessToken: 'tok-123',
      usuario: {
        id: 1,
        nombre: 'Super',
        email: 'a@a.com',
        identidad: null,
        rol: 'super_admin',
        activo: true,
        creadoEn: '2026-01-01T00:00:00.000Z',
        actualizadoEn: '2026-01-01T00:00:00.000Z',
      },
    };

    service.login('a@a.com', 'secreta').subscribe();
    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ identificador: 'a@a.com', password: 'secreta' });
    req.flush(respuesta);

    expect(service.token()).toBe('tok-123');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.esSuperAdmin()).toBe(true);
    expect(service.tieneRol('admin', 'super_admin')).toBe(true);
    expect(service.tieneRol('vendedor')).toBe(false);
  });
});
