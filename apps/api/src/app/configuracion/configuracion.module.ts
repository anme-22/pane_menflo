import { Module } from '@nestjs/common';
import { ConfiguracionController } from './configuracion.controller';
import { ConfiguracionService } from './configuracion.service';

/**
 * Configuración del sistema. Hoy solo lectura (GET /configuracion); la pantalla
 * de edición de banderas es la Feature 12. Exporta el servicio para que
 * FacturasService resuelva impuesto/campos fiscales.
 */
@Module({
  controllers: [ConfiguracionController],
  providers: [ConfiguracionService],
  exports: [ConfiguracionService],
})
export class ConfiguracionModule {}
