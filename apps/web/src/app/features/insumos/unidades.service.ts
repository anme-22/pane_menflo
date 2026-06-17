import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { UnidadMedida } from '@pane/shared';
import { API_BASE } from '../../core/api';

/** Catálogo de unidades de medida (para selects de unidad de compra). */
@Injectable({ providedIn: 'root' })
export class UnidadesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/unidades`;

  listar(): Observable<UnidadMedida[]> {
    return this.http.get<UnidadMedida[]>(this.url);
  }
}
