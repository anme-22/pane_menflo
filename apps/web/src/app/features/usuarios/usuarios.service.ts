import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ActualizarUsuarioRequest,
  CrearUsuarioRequest,
  UsuarioDto,
} from '@pane/shared';
import { API_BASE } from '../../core/api';

/** Cliente HTTP de la API de usuarios (solo super_admin la consume). */
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/usuarios`;

  listar(): Observable<UsuarioDto[]> {
    return this.http.get<UsuarioDto[]>(this.url);
  }

  crear(data: CrearUsuarioRequest): Observable<UsuarioDto> {
    return this.http.post<UsuarioDto>(this.url, data);
  }

  actualizar(id: number, data: ActualizarUsuarioRequest): Observable<UsuarioDto> {
    return this.http.patch<UsuarioDto>(`${this.url}/${id}`, data);
  }

  cambiarEstado(id: number, activo: boolean): Observable<UsuarioDto> {
    return this.http.patch<UsuarioDto>(`${this.url}/${id}/estado`, { activo });
  }
}
