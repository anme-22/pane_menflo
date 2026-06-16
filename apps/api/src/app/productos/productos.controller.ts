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
import type { PrecioDto, ProductoDto } from '@pane/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';
import { CambiarPrecioDto } from './dto/cambiar-precio.dto';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { CambiarEstadoDto } from '../usuarios/dto/cambiar-estado.dto';
import { ProductosService } from './productos.service';

/**
 * Catálogo de productos. Todo requiere sesión. La LECTURA la puede hacer
 * cualquier rol (incluido vendedor, en consulta); la GESTIÓN (crear/editar/
 * precio/estado) solo admin y super_admin. Controlador delgado.
 */
@Controller('productos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Get()
  listar(): Promise<ProductoDto[]> {
    return this.productosService.listar();
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number): Promise<ProductoDto> {
    return this.productosService.obtener(id);
  }

  @Get(':id/precios')
  historial(@Param('id', ParseIntPipe) id: number): Promise<PrecioDto[]> {
    return this.productosService.historial(id);
  }

  @Post()
  @Roles('admin', 'super_admin')
  crear(@Body() dto: CrearProductoDto): Promise<ProductoDto> {
    return this.productosService.crear(dto);
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarProductoDto,
  ): Promise<ProductoDto> {
    return this.productosService.actualizar(id, dto);
  }

  @Patch(':id/estado')
  @Roles('admin', 'super_admin')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoDto,
  ): Promise<ProductoDto> {
    return this.productosService.cambiarEstado(id, dto.activo);
  }

  @Post(':id/precio')
  @Roles('admin', 'super_admin')
  cambiarPrecio(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarPrecioDto,
  ): Promise<PrecioDto> {
    return this.productosService.cambiarPrecio(id, dto.precio);
  }
}
