import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Envuelve el PrismaClient y gestiona su ciclo de vida dentro de Nest.
 * Responsabilidad única (SOLID-S): abrir/cerrar la conexión a la BD.
 * Se inyecta por DI en los servicios que necesiten acceso a datos
 * (SOLID-D: dependen de esta abstracción, no instancian PrismaClient a mano).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Conexión a PostgreSQL establecida.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
