import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type {
  AlertaStockDto,
  CoberturaResultadoDto,
  KardexDto,
  StockDto,
} from '@pane/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ConsultaInventarioService } from './consulta-inventario.service';
import { AjustesService } from './ajustes.service';
import { CoberturaDto } from './dto/cobertura.dto';
import { CrearAjusteDto } from './dto/crear-ajuste.dto';

/**
 * Inventario (consulta). Solo requiere sesión: los TRES roles pueden consultar
 * (el vendedor ve el inventario en modo lectura, CLAUDE.md §7). No muta nada.
 */
@Controller('inventario')
@UseGuards(JwtAuthGuard)
export class InventarioController {
  constructor(
    private readonly consulta: ConsultaInventarioService,
    private readonly ajustes: AjustesService,
  ) {}

  /** Stock actual de cada insumo (unidad base + equivalente + alerta). */
  @Get('existencias')
  existencias(): Promise<StockDto[]> {
    return this.consulta.existencias();
  }

  /** Insumos por debajo de su umbral de stock. */
  @Get('alertas')
  alertas(): Promise<AlertaStockDto[]> {
    return this.consulta.alertas();
  }

  /** Kardex (entradas/salidas con saldo acumulado) de un insumo. */
  @Get('kardex/:insumoId')
  kardex(
    @Param('insumoId', ParseIntPipe) insumoId: number,
  ): Promise<KardexDto> {
    return this.consulta.kardex(insumoId);
  }

  /** Cobertura en días para un escenario de producción. */
  @Post('cobertura')
  cobertura(@Body() dto: CoberturaDto): Promise<CoberturaResultadoDto> {
    return this.consulta.cobertura(dto);
  }

  /**
   * Ajuste manual de stock (conteo físico, merma de insumo, regalo…). Muta el
   * inventario, así que solo admin/super_admin (el vendedor consulta, no ajusta).
   */
  @Post('ajustes')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  ajustar(@Body() dto: CrearAjusteDto): Promise<StockDto> {
    return this.ajustes.ajustar(dto);
  }
}
