import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type {
  ConsumoInsumosReporteDto,
  CuentasPorCobrarReporteDto,
  GananciaReporteDto,
  VentasReporteDto,
} from '@pane/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportesService } from './reportes.service';

/**
 * Reportes de gestión (ventas, ganancia, consumo, cuentas por cobrar). Solo
 * admin/super_admin (CLAUDE.md §7). Solo lectura; el periodo va por query.
 */
@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @Get('ventas')
  ventas(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ): Promise<VentasReporteDto> {
    return this.reportes.ventas(desde, hasta);
  }

  @Get('ganancia-por-producto')
  gananciaPorProducto(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ): Promise<GananciaReporteDto> {
    return this.reportes.gananciaPorProducto(desde, hasta);
  }

  @Get('consumo-insumos')
  consumoInsumos(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ): Promise<ConsumoInsumosReporteDto> {
    return this.reportes.consumoInsumos(desde, hasta);
  }

  @Get('cuentas-por-cobrar')
  cuentasPorCobrar(): Promise<CuentasPorCobrarReporteDto> {
    return this.reportes.cuentasPorCobrar();
  }
}
