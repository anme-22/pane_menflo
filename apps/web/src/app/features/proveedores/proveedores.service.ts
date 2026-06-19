import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ActualizarProveedorRequest,
  CrearProveedorRequest,
  ProveedorDto,
} from '@pane/shared';
import { API_BASE } from '../../core/api';

/** Cliente HTTP de proveedores (CRUD sin borrado: se activa/desactiva). */
@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/proveedores`;

  listar(): Observable<ProveedorDto[]> {
    return this.http.get<ProveedorDto[]>(this.url);
  }

  crear(data: CrearProveedorRequest): Observable<ProveedorDto> {
    return this.http.post<ProveedorDto>(this.url, data);
  }

  actualizar(id: number, data: ActualizarProveedorRequest): Observable<ProveedorDto> {
    return this.http.patch<ProveedorDto>(`${this.url}/${id}`, data);
  }

  cambiarEstado(id: number, activo: boolean): Observable<ProveedorDto> {
    return this.http.patch<ProveedorDto>(`${this.url}/${id}/estado`, { activo });
  }
}
