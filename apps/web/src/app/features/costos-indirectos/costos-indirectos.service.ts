import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ActualizarCostoIndirectoRequest,
  ActualizarParametrosRequest,
  CostosIndirectosResumenDto,
  CrearCostoIndirectoRequest,
} from '@pane/shared';
import { API_BASE } from '../../core/api';

/** Cliente HTTP de costos indirectos. */
@Injectable({ providedIn: 'root' })
export class CostosIndirectosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/costos-indirectos`;

  listar(): Observable<CostosIndirectosResumenDto> {
    return this.http.get<CostosIndirectosResumenDto>(this.url);
  }

  crear(data: CrearCostoIndirectoRequest): Observable<CostosIndirectosResumenDto> {
    return this.http.post<CostosIndirectosResumenDto>(this.url, data);
  }

  actualizar(
    id: number,
    data: ActualizarCostoIndirectoRequest,
  ): Observable<CostosIndirectosResumenDto> {
    return this.http.patch<CostosIndirectosResumenDto>(`${this.url}/${id}`, data);
  }

  cambiarEstado(id: number, activo: boolean): Observable<CostosIndirectosResumenDto> {
    return this.http.patch<CostosIndirectosResumenDto>(`${this.url}/${id}/estado`, { activo });
  }

  actualizarParametros(
    data: ActualizarParametrosRequest,
  ): Observable<CostosIndirectosResumenDto> {
    return this.http.patch<CostosIndirectosResumenDto>(`${this.url}/parametros`, data);
  }
}
