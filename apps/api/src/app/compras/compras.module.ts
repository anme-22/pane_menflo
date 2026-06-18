import { Module } from '@nestjs/common';
import { UnidadesModule } from '../unidades/unidades.module';
import { SucursalesModule } from '../sucursales/sucursales.module';
import { CosteoModule } from '../costeo/costeo.module';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';

/**
 * Módulo de compras. Recibe ConversionService (UnidadesModule), SucursalesService
 * (SucursalesModule) y la estrategia de costeo (CosteoModule, por token) por DI.
 * Cambiar la estrategia no toca a ComprasService.
 */
@Module({
  imports: [UnidadesModule, SucursalesModule, CosteoModule],
  controllers: [ComprasController],
  providers: [ComprasService],
})
export class ComprasModule {}
