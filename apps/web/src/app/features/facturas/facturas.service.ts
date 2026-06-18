import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ActualizarFacturaRequest,
  AnularFacturaRequest,
  ConfiguracionDto,
  CrearFacturaRequest,
  FacturaDto,
  FacturaResumenDto,
  RegistrarAbonoRequest,
} from '@pane/shared';
import { API_BASE } from '../../core/api';

/** Cliente HTTP de facturación. */
@Injectable({ providedIn: 'root' })
export class FacturasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/facturas`;

  listar(): Observable<FacturaResumenDto[]> {
    return this.http.get<FacturaResumenDto[]>(this.url);
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
