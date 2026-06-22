import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { Usuario } from '@prisma/client';
import type { CajaSesionDto, CajaSesionResumenDto } from '@pane/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CajaService } from './caja.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { RegistrarMovimientoCajaDto } from './dto/registrar-movimiento-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';

/**
 * Caja / Arqueo. Todo requiere sesión; los tres roles operan la caja (el
 * vendedor es el cajero). Controlador delgado: la lógica vive en CajaService.
 * La autoría (quién abre/cierra/registra) sale del usuario autenticado.
 */
@Controller('caja')
@UseGuards(JwtAuthGuard)
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  /** Sesión ABIERTA de la sucursal por defecto, o null. */
  @Get('actual')
  actual(): Promise<CajaSesionDto | null> {
    return this.cajaService.obtenerActual();
  }

  /** Histórico de sesiones. */
  @Get()
  listar(): Promise<CajaSesionResumenDto[]> {
    return this.cajaService.listar();
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number): Promise<CajaSesionDto> {
    return this.cajaService.obtener(id);
  }

  /** Abre una sesión de caja con un fondo inicial. */
  @Post('abrir')
  abrir(
    @Body() dto: AbrirCajaDto,
    @CurrentUser() usuario: Usuario,
  ): Promise<CajaSesionDto> {
    return this.cajaService.abrir(dto, usuario.id);
  }

  /** Registra un movimiento manual (ingreso/egreso) en la sesión. */
  @Post(':id/movimientos')
  registrarMovimiento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarMovimientoCajaDto,
    @CurrentUser() usuario: Usuario,
  ): Promise<CajaSesionDto> {
    return this.cajaService.registrarMovimiento(id, dto, usuario.id);
  }

  /** Cierra la sesión con el conteo físico del efectivo. */
  @Post(':id/cerrar')
  cerrar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CerrarCajaDto,
    @CurrentUser() usuario: Usuario,
  ): Promise<CajaSesionDto> {
    return this.cajaService.cerrar(id, dto, usuario.id);
  }
}
