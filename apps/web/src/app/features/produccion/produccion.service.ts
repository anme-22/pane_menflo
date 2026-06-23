import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AnularOrdenProduccionRequest,
  CapturarBolsasRealesRequest,
  CrearOrdenProduccionRequest,
  OrdenProduccionDto,
  OrdenProduccionResumenDto,
  Paginado,
  ProduccionQuery,
} from '@pane/shared';
import { API_BASE } from '../../core/api';

/** Cliente HTTP de órdenes de producción. */
@Injectable({ providedIn: 'root' })
export class ProduccionService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/produccion`;

  /** Lista paginada con filtros (estado, fechas). */
  listar(query: ProduccionQuery = {}): Observable<Paginado<OrdenProduccionResumenDto>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.pageSize) params = params.set('pageSize', query.pageSize);
    if (query.estado) params = params.set('estado', query.estado);
    if (query.desde) params = params.set('desde', query.desde);
    if (query.hasta) params = params.set('hasta', query.hasta);
    return this.http.get<Paginado<OrdenProduccionResumenDto>>(this.url, { params });
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
