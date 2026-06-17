import { Controller, Get, UseGuards } from '@nestjs/common';
import type { UnidadMedida } from '@pane/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversionService } from './conversion.service';

/**
 * Catálogo de unidades de medida (solo lectura). Lo consume el frontend para
 * poblar el selector de unidad de compra. Requiere sesión.
 */
@Controller('unidades')
@UseGuards(JwtAuthGuard)
export class UnidadesController {
  constructor(private readonly conversion: ConversionService) {}

  @Get()
  listar(): Promise<UnidadMedida[]> {
    return this.conversion.listar();
  }
}
