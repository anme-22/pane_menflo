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
import type { ProveedorDto } from '@pane/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CambiarEstadoDto } from '../usuarios/dto/cambiar-estado.dto';
import { CrearProveedorDto } from './dto/crear-proveedor.dto';
import { ActualizarProveedorDto } from './dto/actualizar-proveedor.dto';
import { ProveedoresService } from './proveedores.service';

/**
 * Proveedores. Operación de compras: solo admin/super_admin (igual que compras;
 * el vendedor no gestiona proveedores).
 */
@Controller('proveedores')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Get()
  listar(): Promise<ProveedorDto[]> {
    return this.proveedoresService.listar();
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number): Promise<ProveedorDto> {
    return this.proveedoresService.obtener(id);
  }

  @Post()
  crear(@Body() dto: CrearProveedorDto): Promise<ProveedorDto> {
    return this.proveedoresService.crear(dto);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarProveedorDto,
  ): Promise<ProveedorDto> {
    return this.proveedoresService.actualizar(id, dto);
  }

  @Patch(':id/estado')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoDto,
  ): Promise<ProveedorDto> {
    return this.proveedoresService.cambiarEstado(id, dto.activo);
  }
}
