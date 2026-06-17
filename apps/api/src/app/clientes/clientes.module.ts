import { Module } from '@nestjs/common';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { CensoService } from './censo.service';

/**
 * Módulo de clientes. PrismaService llega por el PrismaModule global.
 * Separa la gestión de clientes (ClientesService) del lookup del censo
 * (CensoService, solo lectura).
 */
@Module({
  controllers: [ClientesController],
  providers: [ClientesService, CensoService],
})
export class ClientesModule {}
