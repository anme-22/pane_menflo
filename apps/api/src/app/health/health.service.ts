import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'up' | 'down';
  timestamp: string;
}

/**
 * Lógica del chequeo de salud. La mantenemos en un servicio (SOLID-S) para que
 * el controlador quede delgado y la verificación sea testeable de forma aislada.
 */
@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  /** Confirma que la API responde y que la conexión a la BD funciona. */
  async check(): Promise<HealthStatus> {
    let database: 'up' | 'down' = 'down';
    try {
      // Ping mínimo a PostgreSQL.
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }

    return {
      status: database === 'up' ? 'ok' : 'error',
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
