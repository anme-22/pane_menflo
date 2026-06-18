import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ConsumoInsumosReporteDto,
  CuentasPorCobrarReporteDto,
  GananciaReporteDto,
  VentasReporteDto,
} from '@pane/shared';
import { API_BASE } from '../../core/api';

/** Cliente HTTP de reportes (solo lectura). */
@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/reportes`;

  private periodo(desde: string, hasta: string): { params: HttpParams } {
    return { params: new HttpParams().set('desde', desde).set('hasta', hasta) };
  }

  ventas(desde: string, hasta: string): Observable<VentasReporteDto> {
    return this.http.get<VentasReporteDto>(`${this.url}/ventas`, this.periodo(desde, hasta));
  }

  gananciaPorProducto(desde: string, hasta: string): Observable<GananciaReporteDto> {
    return this.http.get<GananciaReporteDto>(
      `${this.url}/ganancia-por-producto`,
      this.periodo(desde, hasta),
    );
  }

  consumoInsumos(desde: string, hasta: string): Observable<ConsumoInsumosReporteDto> {
    return this.http.get<ConsumoInsumosReporteDto>(
      `${this.url}/consumo-insumos`,
      this.periodo(desde, hasta),
    );
  }

  cuentasPorCobrar(): Observable<CuentasPorCobrarReporteDto> {
    return this.http.get<CuentasPorCobrarReporteDto>(`${this.url}/cuentas-por-cobrar`);
  }
}
