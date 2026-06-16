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
import type { UsuarioDto } from '@pane/shared';
import type { Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { UsuariosService } from './usuarios.service';

/**
 * Gestión de usuarios. TODO el controlador exige JWT y rol `super_admin`
 * (solo el super admin crea/edita/activa usuarios — CLAUDE.md §7).
 * Controlador delgado: delega toda la lógica en el servicio.
 */
@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  listar(): Promise<UsuarioDto[]> {
    return this.usuariosService.listar();
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number): Promise<UsuarioDto> {
    return this.usuariosService.obtener(id);
  }

  @Post()
  crear(@Body() dto: CrearUsuarioDto): Promise<UsuarioDto> {
    return this.usuariosService.crear(dto);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUsuarioDto,
  ): Promise<UsuarioDto> {
    return this.usuariosService.actualizar(id, dto);
  }

  @Patch(':id/estado')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoDto,
    @CurrentUser() actor: Usuario,
  ): Promise<UsuarioDto> {
    return this.usuariosService.cambiarEstado(id, dto.activo, actor.id);
  }
}
