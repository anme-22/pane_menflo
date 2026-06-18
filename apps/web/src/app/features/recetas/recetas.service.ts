import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ActualizarRecetaRequest,
  CrearRecetaRequest,
  RecetaDto,
  RecetaResumenDto,
} from '@pane/shared';
import { API_BASE } from '../../core/api';

/** Cliente HTTP de recetas. */
@Injectable({ providedIn: 'root' })
export class RecetasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/recetas`;

  listar(): Observable<RecetaResumenDto[]> {
    return this.http.get<RecetaResumenDto[]>(this.url);
  }

  obtenerPorProducto(productoId: number): Observable<RecetaDto | null> {
    return this.http.get<RecetaDto | null>(`${this.url}/producto/${productoId}`);
  }

  crear(data: CrearRecetaRequest): Observable<RecetaDto> {
    return this.http.post<RecetaDto>(this.url, data);
  }

  actualizar(id: number, data: ActualizarRecetaRequest): Observable<RecetaDto> {
    return this.http.patch<RecetaDto>(`${this.url}/${id}`, data);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
