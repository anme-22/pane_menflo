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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConsultaInventarioService } from './consulta-inventario.service';
import { CoberturaDto } from './dto/cobertura.dto';

/**
 * Inventario (consulta). Solo requiere sesión: los TRES roles pueden consultar
 * (el vendedor ve el inventario en modo lectura, CLAUDE.md §7). No muta nada.
 */
@Controller('inventario')
@UseGuards(JwtAuthGuard)
export class InventarioController {
  constructor(private readonly consulta: ConsultaInventarioService) {}

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
}
