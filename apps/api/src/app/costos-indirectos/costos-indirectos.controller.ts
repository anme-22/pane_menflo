import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { CostosIndirectosResumenDto } from '@pane/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CambiarEstadoDto } from '../usuarios/dto/cambiar-estado.dto';
import { CostosIndirectosService } from './costos-indirectos.service';
import { CrearCostoIndirectoDto } from './dto/crear-costo-indirecto.dto';
import { ActualizarCostoIndirectoDto } from './dto/actualizar-costo-indirecto.dto';
import { ActualizarParametrosDto } from './dto/actualizar-parametros.dto';

/**
 * Costos indirectos (gestión del negocio): solo admin/super_admin. Afectan el
 * costo por bolsa de todas las recetas, así que se controlan con cuidado.
 */
@Controller('costos-indirectos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class CostosIndirectosController {
  constructor(private readonly servicio: CostosIndirectosService) {}

  @Get()
  listar(): Promise<CostosIndirectosResumenDto> {
    return this.servicio.listar();
  }

  @Post()
  crear(@Body() dto: CrearCostoIndirectoDto): Promise<CostosIndirectosResumenDto> {
    return this.servicio.crear(dto);
  }

  /** Actualiza el parámetro de prorrateo. Antes de `:id` para que no choque. */
  @Patch('parametros')
  actualizarParametros(
    @Body() dto: ActualizarParametrosDto,
  ): Promise<CostosIndirectosResumenDto> {
    return this.servicio.actualizarQuintalesPorMes(dto.quintalesPorMes);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarCostoIndirectoDto,
  ): Promise<CostosIndirectosResumenDto> {
    return this.servicio.actualizar(id, dto);
  }

  @Patch(':id/estado')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoDto,
  ): Promise<CostosIndirectosResumenDto> {
    return this.servicio.cambiarEstado(id, dto.activo);
  }
}
