import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import type { LoginResponse, RolUsuario, UsuarioDto } from '@pane/shared';
import { API_BASE } from '../api';

const TOKEN_KEY = 'pane-token';
const USER_KEY = 'pane-user';

/**
 * Estado de autenticación de la app (SOLID-S). Mantiene el token y el usuario
 * actual como signals (Angular 21) y los persiste en localStorage para
 * sobrevivir recargas. Es la única fuente de verdad de la sesión.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  /** Token de acceso actual (o null). */
  readonly token = signal<string | null>(this.leerToken());
  /** Usuario autenticado (o null). */
  readonly usuario = signal<UsuarioDto | null>(this.leerUsuario());

  /** ¿Hay sesión iniciada? */
  readonly isAuthenticated = computed(() => this.token() !== null);
  /** Atajos de rol para mostrar/ocultar UI. */
  readonly esSuperAdmin = computed(() => this.usuario()?.rol === 'super_admin');

  /** Inicia sesión (con correo o identidad) y guarda la sesión si tiene éxito. */
  login(identificador: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_BASE}/auth/login`, { identificador, password })
      .pipe(tap((res) => this.guardarSesion(res.accessToken, res.usuario)));
  }

  /** Cierra sesión y vuelve al login. */
  logout(): void {
    this.token.set(null);
    this.usuario.set(null);
    this.borrar(TOKEN_KEY);
    this.borrar(USER_KEY);
    void this.router.navigate(['/login']);
  }

  /** ¿El usuario actual tiene alguno de estos roles? */
  tieneRol(...roles: RolUsuario[]): boolean {
    const rol = this.usuario()?.rol;
    return rol !== undefined && roles.includes(rol);
  }

  private guardarSesion(token: string, usuario: UsuarioDto): void {
    this.token.set(token);
    this.usuario.set(usuario);
    this.escribir(TOKEN_KEY, token);
    this.escribir(USER_KEY, JSON.stringify(usuario));
  }

  // ---- acceso seguro a localStorage (puede no existir en SSR/pruebas) ----

  private leerToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private leerUsuario(): UsuarioDto | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as UsuarioDto) : null;
    } catch {
      return null;
    }
  }

  private escribir(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignorar */
    }
  }

  private borrar(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignorar */
    }
  }
}
