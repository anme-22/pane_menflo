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
import type { Usuario } from '@prisma/client';
import type { FacturaDto, FacturaResumenDto, Paginado } from '@pane/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FacturasService } from './facturas.service';
import { CrearFacturaDto } from './dto/crear-factura.dto';
import { FacturasQueryDto } from './dto/facturas-query.dto';
import { ActualizarFacturaDto } from './dto/actualizar-factura.dto';
import { AnularFacturaDto } from './dto/anular-factura.dto';
import { RegistrarAbonoDto } from './dto/registrar-abono.dto';

/**
 * Facturación. Todo requiere sesión; los tres roles gestionan facturas (el
 * vendedor crea/ve/imprime/edita-con-motivo). Controlador delgado: la lógica
 * vive en FacturasService. La autoría (quién) sale del usuario autenticado.
 */
@Controller('facturas')
@UseGuards(JwtAuthGuard)
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  @Get()
  listar(@Query() query: FacturasQueryDto): Promise<Paginado<FacturaResumenDto>> {
    return this.facturasService.listar(query);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number): Promise<FacturaDto> {
    return this.facturasService.obtener(id);
  }

  @Post()
  crear(
    @Body() dto: CrearFacturaDto,
    @CurrentUser() usuario: Usuario,
  ): Promise<FacturaDto> {
    return this.facturasService.crear(dto, usuario.id);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarFacturaDto,
    @CurrentUser() usuario: Usuario,
  ): Promise<FacturaDto> {
    return this.facturasService.actualizar(id, dto, usuario.id);
  }

  /** Emite el borrador (lo congela y deja rastro). */
  @Post(':id/emitir')
  emitir(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: Usuario,
  ): Promise<FacturaDto> {
    return this.facturasService.emitir(id, usuario.id);
  }

  /** Anula la factura con motivo obligatorio (no se borra). */
  @Post(':id/anular')
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularFacturaDto,
    @CurrentUser() usuario: Usuario,
  ): Promise<FacturaDto> {
    return this.facturasService.anular(id, dto, usuario.id);
  }

  /** Registra un abono (solo crédito emitida). */
  @Post(':id/abonos')
  registrarAbono(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarAbonoDto,
    @CurrentUser() usuario: Usuario,
  ): Promise<FacturaDto> {
    return this.facturasService.registrarAbono(id, dto, usuario.id);
  }
}
