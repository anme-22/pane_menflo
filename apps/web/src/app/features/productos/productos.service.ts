import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ActualizarProductoRequest,
  CrearProductoRequest,
  PrecioDto,
  ProductoDto,
} from '@pane/shared';
import { API_BASE } from '../../core/api';

/** Cliente HTTP del catálogo de productos. */
@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/productos`;

  listar(): Observable<ProductoDto[]> {
    return this.http.get<ProductoDto[]>(this.url);
  }

  crear(data: CrearProductoRequest): Observable<ProductoDto> {
    return this.http.post<ProductoDto>(this.url, data);
  }

  actualizar(id: number, data: ActualizarProductoRequest): Observable<ProductoDto> {
    return this.http.patch<ProductoDto>(`${this.url}/${id}`, data);
  }

  cambiarEstado(id: number, activo: boolean): Observable<ProductoDto> {
    return this.http.patch<ProductoDto>(`${this.url}/${id}/estado`, { activo });
  }

  cambiarPrecio(id: number, precio: number): Observable<PrecioDto> {
    return this.http.post<PrecioDto>(`${this.url}/${id}/precio`, { precio });
  }

  historial(id: number): Observable<PrecioDto[]> {
    return this.http.get<PrecioDto[]>(`${this.url}/${id}/precios`);
  }
}
