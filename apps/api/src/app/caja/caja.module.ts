import { Module } from '@nestjs/common';
import { SucursalesModule } from '../sucursales/sucursales.module';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';

/**
 * Módulo de Caja / Arqueo. Reutiliza SucursalesService (sucursal default) por DI.
 * El esperado se calcula leyendo facturas/abonos por ventana de tiempo.
 */
@Module({
  imports: [SucursalesModule],
  controllers: [CajaController],
  providers: [CajaService],
})
export class CajaModule {}
