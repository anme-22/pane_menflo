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
import type { InsumoDto } from '@pane/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CambiarEstadoDto } from '../usuarios/dto/cambiar-estado.dto';
import { ActualizarInsumoDto } from './dto/actualizar-insumo.dto';
import { CrearInsumoDto } from './dto/crear-insumo.dto';
import { InsumosService } from './insumos.service';

/**
 * Insumos. Todo requiere sesión. La LECTURA la puede hacer cualquier rol
 * (el vendedor ve inventario en consulta); la GESTIÓN solo admin/super_admin.
 */
@Controller('insumos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InsumosController {
  constructor(private readonly insumosService: InsumosService) {}

  @Get()
  listar(): Promise<InsumoDto[]> {
    return this.insumosService.listar();
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number): Promise<InsumoDto> {
    return this.insumosService.obtener(id);
  }

  @Post()
  @Roles('admin', 'super_admin')
  crear(@Body() dto: CrearInsumoDto): Promise<InsumoDto> {
    return this.insumosService.crear(dto);
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarInsumoDto,
  ): Promise<InsumoDto> {
    return this.insumosService.actualizar(id, dto);
  }

  @Patch(':id/estado')
  @Roles('admin', 'super_admin')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoDto,
  ): Promise<InsumoDto> {
    return this.insumosService.cambiarEstado(id, dto.activo);
  }
}
