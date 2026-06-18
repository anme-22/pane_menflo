import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { RecetaDto, RecetaResumenDto } from '@pane/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActualizarRecetaDto } from './dto/actualizar-receta.dto';
import { CrearRecetaDto } from './dto/crear-receta.dto';
import { RecetasService } from './recetas.service';

/**
 * Recetas. Las gestiona el negocio: solo admin/super_admin (CLAUDE.md §7).
 * Controlador delgado.
 */
@Controller('recetas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class RecetasController {
  constructor(private readonly recetasService: RecetasService) {}

  @Get()
  listar(): Promise<RecetaResumenDto[]> {
    return this.recetasService.listar();
  }

  /** Receta de un producto (o null). Se declara antes de `:id`. */
  @Get('producto/:productoId')
  obtenerPorProducto(
    @Param('productoId', ParseIntPipe) productoId: number,
  ): Promise<RecetaDto | null> {
    return this.recetasService.obtenerPorProducto(productoId);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number): Promise<RecetaDto> {
    return this.recetasService.obtener(id);
  }

  @Post()
  crear(@Body() dto: CrearRecetaDto): Promise<RecetaDto> {
    return this.recetasService.crear(dto);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarRecetaDto,
  ): Promise<RecetaDto> {
    return this.recetasService.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  eliminar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.recetasService.eliminar(id);
  }
}
