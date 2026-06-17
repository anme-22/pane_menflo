import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ActualizarClienteRequest,
  CensoLookupResponse,
  ClienteDto,
  CrearClienteRequest,
} from '@pane/shared';
import { API_BASE } from '../../core/api';

/** Cliente HTTP de Clientes y del lookup del censo. */
@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/clientes`;

  listar(): Observable<ClienteDto[]> {
    return this.http.get<ClienteDto[]>(this.url);
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
