import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AbrirCajaRequest,
  CajaSesionDto,
  CajaSesionResumenDto,
  CerrarCajaRequest,
  RegistrarMovimientoCajaRequest,
} from '@pane/shared';
import { API_BASE } from '../../core/api';

/**
 * Cliente HTTP de Caja / Arqueo. La sesión actual, el histórico, abrir, registrar
 * movimientos y cerrar. El esperado lo calcula el backend (no se guarda hasta el
 * cierre).
 */
@Injectable({ providedIn: 'root' })
export class CajaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/caja`;

  /** Sesión ABIERTA de la sucursal (o null si no hay). */
  actual(): Observable<CajaSesionDto | null> {
    return this.http.get<CajaSesionDto | null>(`${this.url}/actual`);
  }

  listar(): Observable<CajaSesionResumenDto[]> {
    return this.http.get<CajaSesionResumenDto[]>(this.url);
  }

  obtener(id: number): Observable<CajaSesionDto> {
    return this.http.get<CajaSesionDto>(`${this.url}/${id}`);
  }

  abrir(data: AbrirCajaRequest): Observable<CajaSesionDto> {
    return this.http.post<CajaSesionDto>(`${this.url}/abrir`, data);
  }

  registrarMovimiento(
    id: number,
    data: RegistrarMovimientoCajaRequest,
  ): Observable<CajaSesionDto> {
    return this.http.post<CajaSesionDto>(`${this.url}/${id}/movimientos`, data);
  }

  cerrar(id: number, data: CerrarCajaRequest): Observable<CajaSesionDto> {
    return this.http.post<CajaSesionDto>(`${this.url}/${id}/cerrar`, data);
  }
}
