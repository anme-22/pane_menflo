import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ActualizarClienteRequest,
  CensoLookupResponse,
  ClienteDto,
  ClientesQuery,
  CrearClienteRequest,
  Paginado,
} from '@pane/shared';
import { API_BASE } from '../../core/api';

/** Cliente HTTP de Clientes y del lookup del censo. */
@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/clientes`;

  /** Lista paginada con filtros (búsqueda, estado). */
  listar(query: ClientesQuery = {}): Observable<Paginado<ClienteDto>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.pageSize) params = params.set('pageSize', query.pageSize);
    if (query.buscar) params = params.set('buscar', query.buscar);
    if (query.activo !== undefined) params = params.set('activo', query.activo);
    return this.http.get<Paginado<ClienteDto>>(this.url, { params });
  }

  crear(data: CrearClienteRequest): Observable<ClienteDto> {
    return this.http.post<ClienteDto>(this.url, data);
  }

  actualizar(
    identidad: string,
    data: ActualizarClienteRequest,
  ): Observable<ClienteDto> {
    return this.http.patch<ClienteDto>(`${this.url}/${identidad}`, data);
  }

  cambiarEstado(identidad: string, activo: boolean): Observable<ClienteDto> {
    return this.http.patch<ClienteDto>(`${this.url}/${identidad}/estado`, {
      activo,
    });
  }

  /** Busca la identidad en el censo para autocompletar nombres y sexo. */
  lookupCenso(identidad: string): Observable<CensoLookupResponse> {
    return this.http.get<CensoLookupResponse>(`${this.url}/censo/${identidad}`);
  }
}
