import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ActualizarInsumoRequest,
  CrearInsumoRequest,
  InsumoDto,
} from '@pane/shared';
import { API_BASE } from '../../core/api';

/** Cliente HTTP de insumos. */
@Injectable({ providedIn: 'root' })
export class InsumosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/insumos`;

  listar(): Observable<InsumoDto[]> {
    return this.http.get<InsumoDto[]>(this.url);
  }

  crear(data: CrearInsumoRequest): Observable<InsumoDto> {
    return this.http.post<InsumoDto>(this.url, data);
  }

  actualizar(id: number, data: ActualizarInsumoRequest): Observable<InsumoDto> {
    return this.http.patch<InsumoDto>(`${this.url}/${id}`, data);
  }

  cambiarEstado(id: number, activo: boolean): Observable<InsumoDto> {
    return this.http.patch<InsumoDto>(`${this.url}/${id}/estado`, { activo });
  }
}
