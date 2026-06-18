import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AlertaStockDto,
  CoberturaRequest,
  CoberturaResultadoDto,
  KardexDto,
  StockDto,
} from '@pane/shared';
import { API_BASE } from '../../core/api';

/** Cliente HTTP de inventario (consulta): existencias, alertas, kardex, cobertura. */
@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/inventario`;

  existencias(): Observable<StockDto[]> {
    return this.http.get<StockDto[]>(`${this.url}/existencias`);
  }

  alertas(): Observable<AlertaStockDto[]> {
    return this.http.get<AlertaStockDto[]>(`${this.url}/alertas`);
  }

  kardex(insumoId: number): Observable<KardexDto> {
    return this.http.get<KardexDto>(`${this.url}/kardex/${insumoId}`);
  }

  cobertura(data: CoberturaRequest): Observable<CoberturaResultadoDto> {
    return this.http.post<CoberturaResultadoDto>(`${this.url}/cobertura`, data);
  }
}
