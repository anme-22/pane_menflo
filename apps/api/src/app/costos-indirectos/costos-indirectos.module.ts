import { Module } from '@nestjs/common';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { CostosIndirectosController } from './costos-indirectos.controller';
import { CostosIndirectosService } from './costos-indirectos.service';

/**
 * Módulo de costos indirectos. Reutiliza ConfiguracionService para leer/actualizar
 * `quintalesPorMes` (base del prorrateo POR_MES). El costeo en sí lo aplica
 * CostoRecetaService (F6, ya integrado con esta mejora).
 */
@Module({
  imports: [ConfiguracionModule],
  controllers: [CostosIndirectosController],
  providers: [CostosIndirectosService],
})
export class CostosIndirectosModule {}
