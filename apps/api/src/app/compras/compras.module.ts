import { Module } from '@nestjs/common';
import { UnidadesModule } from '../unidades/unidades.module';
import { SucursalesModule } from '../sucursales/sucursales.module';
import {
  ESTRATEGIA_COSTEO,
} from '../costeo/estrategia-costeo';
import { CostoPromedioPonderadoStrategy } from '../costeo/costo-promedio-ponderado.strategy';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';

/**
 * Módulo de compras. Recibe ConversionService (UnidadesModule) y
 * SucursalesService (SucursalesModule) por DI. La estrategia de costeo se
 * inyecta por token: hoy promedio ponderado; cambiarla no toca a ComprasService.
 */
@Module({
  imports: [UnidadesModule, SucursalesModule],
  controllers: [ComprasController],
  providers: [
    ComprasService,
    { provide: ESTRATEGIA_COSTEO, useClass: CostoPromedioPonderadoStrategy },
  ],
})
export class ComprasModule {}
