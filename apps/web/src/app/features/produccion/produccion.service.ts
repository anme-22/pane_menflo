import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AnularOrdenProduccionRequest,
  CapturarBolsasRealesRequest,
  CrearOrdenProduccionRequest,
  OrdenProduccionDto,
  OrdenProduccionResumenDto,
} from '@pane/shared';
import { API_BASE } from '../../core/api';

/** Cliente HTTP de órdenes de producción. */
@Injectable({ providedIn: 'root' })
export class ProduccionService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/produccion`;

  listar(): Observable<OrdenProduccionResumenDto[]> {
    return this.http.get<OrdenProduccionResumenDto[]>(this.url);
  }

  obtener(id: number): Observable<OrdenProduccionDto> {
    return this.http.get<OrdenProduccionDto>(`${this.url}/${id}`);
  }

  crear(data: CrearOrdenProduccionRequest): Observable<OrdenProduccionDto> {
    return this.http.post<OrdenProduccionDto>(this.url, data);
  }

  /** Confirma la orden (descuenta inventario y congela el costo). */
  confirmar(id: number): Observable<OrdenProduccionDto> {
    return this.http.post<OrdenProduccionDto>(`${this.url}/${id}/confirmar`, {});
  }

  capturarBolsasReales(
    id: number,
    data: CapturarBolsasRealesRequest,
  ): Observable<OrdenProduccionDto> {
    return this.http.patch<OrdenProduccionDto>(`${this.url}/${id}/bolsas-reales`, data);
  }

  anular(
    id: number,
    data: AnularOrdenProduccionRequest,
  ): Observable<OrdenProduccionDto> {
    return this.http.post<OrdenProduccionDto>(`${this.url}/${id}/anular`, data);
  }
}
