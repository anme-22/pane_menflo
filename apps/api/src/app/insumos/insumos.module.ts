import { Module } from '@nestjs/common';
import { SucursalesModule } from '../sucursales/sucursales.module';
import { InsumosController } from './insumos.controller';
import { InsumosService } from './insumos.service';

/**
 * Módulo de insumos. PrismaService llega por el PrismaModule global;
 * SucursalesService por el SucursalesModule (para la existencia por defecto).
 */
@Module({
  imports: [SucursalesModule],
  controllers: [InsumosController],
  providers: [InsumosService],
})
export class InsumosModule {}
