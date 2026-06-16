import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

/**
 * GET /health — controlador delgado: delega la verificación al servicio.
 * Esta ruta queda excluida del prefijo global 'api' (ver main.ts).
 */
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async check() {
    const result = await this.health.check();
    // Si la BD está caída devolvemos 503 con el detalle, para que sirva como
    // sonda real de readiness (no solo "la API está viva").
    if (result.status !== 'ok') {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }
}
