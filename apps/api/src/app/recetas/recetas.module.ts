import { Module } from '@nestjs/common';
import { UnidadesModule } from '../unidades/unidades.module';
import { SucursalesModule } from '../sucursales/sucursales.module';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { RecetasController } from './recetas.controller';
import { RecetasService } from './recetas.service';
import { CostoRecetaService } from './costo-receta.service';

/**
 * Módulo de recetas. Reutiliza ConversionService (UnidadesModule) y
 * SucursalesService (SucursalesModule) por DI para el costeo de la receta.
 */
@Module({
  imports: [UnidadesModule, SucursalesModule, ConfiguracionModule],
  controllers: [RecetasController],
  providers: [RecetasService, CostoRecetaService],
  exports: [CostoRecetaService],
})
export class RecetasModule {}
