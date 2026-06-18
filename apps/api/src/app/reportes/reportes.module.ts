import { Module } from '@nestjs/common';
import { RecetasModule } from '../recetas/recetas.module';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

/**
 * Módulo de reportes (solo lectura). Reutiliza CostoRecetaService (RecetasModule)
 * para el costo por bolsa de la ganancia; el saldo de cuentas por cobrar reusa
 * calcularPago (F9). No duplica lógica de costeo ni de pago.
 */
@Module({
  imports: [RecetasModule],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
