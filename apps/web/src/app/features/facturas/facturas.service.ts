import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ActualizarFacturaRequest,
  AnularFacturaRequest,
  ConfiguracionDto,
  CrearFacturaRequest,
  FacturaDto,
  FacturaResumenDto,
  FacturasQuery,
  Paginado,
  RegistrarAbonoRequest,
} from '@pane/shared';
import { API_BASE } from '../../core/api';

/** Cliente HTTP de facturación. */
@Injectable({ providedIn: 'root' })
export class FacturasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/facturas`;

  /** Lista paginada con filtros (estado, pago, fechas, búsqueda). */
  listar(query: FacturasQuery = {}): Observable<Paginado<FacturaResumenDto>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.pageSize) params = params.set('pageSize', query.pageSize);
    if (query.estado) params = params.set('estado', query.estado);
    if (query.tipoPago) params = params.set('tipoPago', query.tipoPago);
    if (query.desde) params = params.set('desde', query.desde);
    if (query.hasta) params = params.set('hasta', query.hasta);
    if (query.buscar) params = params.set('buscar', query.buscar);
    return this.http.get<Paginado<FacturaResumenDto>>(this.url, { params });
  }

  obtener(id: number): Observable<FacturaDto> {
    return this.http.get<FacturaDto>(`${this.url}/${id}`);
  }

  crear(data: CrearFacturaRequest): Observable<FacturaDto> {
    return this.http.post<FacturaDto>(this.url, data);
  }

  actualizar(id: number, data: ActualizarFacturaRequest): Observable<FacturaDto> {
    return this.http.patch<FacturaDto>(`${this.url}/${id}`, data);
  }

  emitir(id: number): Observable<FacturaDto> {
    return this.http.post<FacturaDto>(`${this.url}/${id}/emitir`, {});
  }

  anular(id: number, data: AnularFacturaRequest): Observable<FacturaDto> {
    return this.http.post<FacturaDto>(`${this.url}/${id}/anular`, data);
  }

  registrarAbono(id: number, data: RegistrarAbonoRequest): Observable<FacturaDto> {
    return this.http.post<FacturaDto>(`${this.url}/${id}/abonos`, data);
  }

  configuracion(): Observable<ConfiguracionDto> {
    return this.http.get<ConfiguracionDto>(`${API_BASE}/configuracion`);
  }
}
