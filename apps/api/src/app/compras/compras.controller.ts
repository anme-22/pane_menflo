import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { CompraDto } from '@pane/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CrearCompraDto } from './dto/crear-compra.dto';
import { ComprasService } from './compras.service';

/**
 * Compras. Operación sensible de costo: solo admin/super_admin (el vendedor no
 * registra ni consulta compras). Controlador delgado.
 */
@Controller('compras')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  @Get()
  listar(@Query('insumoId') insumoId?: string): Promise<CompraDto[]> {
    return this.comprasService.listar(insumoId ? Number(insumoId) : undefined);
  }

  @Post()
  crear(@Body() dto: CrearCompraDto): Promise<CompraDto> {
    return this.comprasService.crear(dto);
  }
}
