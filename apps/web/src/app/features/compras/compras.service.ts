import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { CompraDto, CrearCompraRequest } from '@pane/shared';
import { API_BASE } from '../../core/api';

/** Cliente HTTP de compras. */
@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/compras`;

  listar(): Observable<CompraDto[]> {
    return this.http.get<CompraDto[]>(this.url);
  }

  crear(data: CrearCompraRequest): Observable<CompraDto> {
    return this.http.post<CompraDto>(this.url, data);
  }
}
