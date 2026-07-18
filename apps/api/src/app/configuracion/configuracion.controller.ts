import { Controller, Get, UseGuards } from '@nestjs/common';
import type { ConfiguracionDto, NegocioDto } from '@pane/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfiguracionService } from './configuracion.service';

/**
 * Configuración del sistema (solo lectura aquí; la edición es F12). Cualquier
 * usuario autenticado puede leer las banderas (las usa el frontend de facturas).
 */
@Controller('configuracion')
@UseGuards(JwtAuthGuard)
export class ConfiguracionController {
  constructor(private readonly configuracion: ConfiguracionService) {}

  @Get()
  obtener(): Promise<ConfiguracionDto> {
    return this.configuracion.obtenerDto();
  }

  /** Datos del negocio para el ticket impreso (desde variables de entorno). */
  @Get('negocio')
  negocio(): NegocioDto {
    return this.configuracion.obtenerNegocio();
  }
}
