import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Módulo global de acceso a datos. Al ser @Global, cualquier feature puede
 * inyectar PrismaService sin reimportar el módulo (evita providers duplicados).
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
