import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  OrdenProduccionDto,
  OrdenProduccionResumenDto,
  Paginado,
} from '@pane/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProduccionService } from './produccion.service';
import { CrearOrdenDto } from './dto/crear-orden.dto';
import { ProduccionQueryDto } from './dto/produccion-query.dto';
import { CapturarBolsasRealesDto } from './dto/capturar-bolsas-reales.dto';
import { AnularOrdenDto } from './dto/anular-orden.dto';

/**
 * Órdenes de producción. Operación del negocio: solo admin/super_admin
 * (CLAUDE.md §7). Controlador delgado: la lógica vive en ProduccionService.
 */
@Controller('produccion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class ProduccionController {
  constructor(private readonly produccionService: ProduccionService) {}

  @Get()
  listar(
    @Query() query: ProduccionQueryDto,
  ): Promise<Paginado<OrdenProduccionResumenDto>> {
    return this.produccionService.listar(query);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number): Promise<OrdenProduccionDto> {
    return this.produccionService.obtener(id);
  }

  @Post()
  crear(@Body() dto: CrearOrdenDto): Promise<OrdenProduccionDto> {
    return this.produccionService.crear(dto);
  }

  /** Confirma la orden: descuenta inventario y congela el costo (idempotente). */
  @Post(':id/confirmar')
  confirmar(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrdenProduccionDto> {
    return this.produccionService.confirmar(id);
  }

  /** Captura las bolsas reales producidas (merma = esperadas − reales). */
  @Patch(':id/bolsas-reales')
  capturarBolsasReales(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CapturarBolsasRealesDto,
  ): Promise<OrdenProduccionDto> {
    return this.produccionService.capturarBolsasReales(id, dto);
  }

  /** Anula la orden con motivo obligatorio (deja rastro; no se borra). */
  @Post(':id/anular')
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularOrdenDto,
  ): Promise<OrdenProduccionDto> {
    return this.produccionService.anular(id, dto);
  }
}
