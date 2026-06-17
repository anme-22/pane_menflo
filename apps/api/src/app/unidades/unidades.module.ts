import { Module } from '@nestjs/common';
import { ConversionService } from './conversion.service';
import { UnidadesController } from './unidades.controller';

/**
 * Módulo de unidades de medida. Expone el catálogo (GET /unidades) y el
 * ConversionService, que otros módulos (compras) reciben por DI.
 */
@Module({
  controllers: [UnidadesController],
  providers: [ConversionService],
  exports: [ConversionService],
})
export class UnidadesModule {}
