import { Module } from '@nestjs/common';
import { SucursalesModule } from '../sucursales/sucursales.module';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { ImpuestoModule } from '../impuesto/impuesto.module';
import { FacturasController } from './facturas.controller';
import { FacturasService } from './facturas.service';
import { BitacoraService } from './bitacora.service';

/**
 * Módulo de facturación. Reutiliza SucursalesService (sucursal default),
 * ConfiguracionService (banderas ISV/fiscal) y la estrategia de impuesto
 * (ImpuestoModule, por token) por DI. BitacoraService escribe el rastro.
 */
@Module({
  imports: [SucursalesModule, ConfiguracionModule, ImpuestoModule],
  controllers: [FacturasController],
  providers: [FacturasService, BitacoraService],
})
export class FacturasModule {}
