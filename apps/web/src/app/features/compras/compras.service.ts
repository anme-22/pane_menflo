import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  CompraDto,
  ComprasQuery,
  CrearCompraRequest,
  Paginado,
} from '@pane/shared';
import { API_BASE } from '../../core/api';

/** Cliente HTTP de compras. */
@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/compras`;

  /** Lista paginada con filtros (insumo, proveedor, fechas). */
  listar(query: ComprasQuery = {}): Observable<Paginado<CompraDto>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.pageSize) params = params.set('pageSize', query.pageSize);
    if (query.insumoId) params = params.set('insumoId', query.insumoId);
    if (query.proveedorId) params = params.set('proveedorId', query.proveedorId);
    if (query.desde) params = params.set('desde', query.desde);
    if (query.hasta) params = params.set('hasta', query.hasta);
    return this.http.get<Paginado<CompraDto>>(this.url, { params });
  }

  crear(data: CrearCompraRequest): Observable<CompraDto> {
    return this.http.post<CompraDto>(this.url, data);
  }
}
