import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { CensoLookupResponse, ClienteDto, Paginado } from '@pane/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CambiarEstadoDto } from '../usuarios/dto/cambiar-estado.dto';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';
import { ClientesQueryDto } from './dto/clientes-query.dto';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { CensoService } from './censo.service';
import { ClientesService } from './clientes.service';

/**
 * Clientes. Todo requiere sesión. Los TRES roles (incluido vendedor) pueden
 * gestionar clientes (CLAUDE.md §7), así que basta JwtAuthGuard. Controlador
 * delgado: la lógica vive en ClientesService y el lookup en CensoService.
 */
@Controller('clientes')
@UseGuards(JwtAuthGuard)
export class ClientesController {
  constructor(
    private readonly clientes: ClientesService,
    private readonly censo: CensoService,
  ) {}

  @Get()
  listar(@Query() query: ClientesQueryDto): Promise<Paginado<ClienteDto>> {
    return this.clientes.listar(query);
  }

  /**
   * Lookup en el censo (solo lectura) para autocompletar nombres y sexo.
   * Se declara antes de `:identidad` por claridad (rutas de distinta longitud).
   */
  @Get('censo/:identidad')
  lookupCenso(
    @Param('identidad') identidad: string,
  ): Promise<CensoLookupResponse> {
    return this.censo.buscarPorIdentidad(identidad);
  }

  @Get(':identidad')
  obtener(@Param('identidad') identidad: string): Promise<ClienteDto> {
    return this.clientes.obtener(identidad);
  }

  @Post()
  crear(@Body() dto: CrearClienteDto): Promise<ClienteDto> {
    return this.clientes.crear(dto);
  }

  @Patch(':identidad')
  actualizar(
    @Param('identidad') identidad: string,
    @Body() dto: ActualizarClienteDto,
  ): Promise<ClienteDto> {
    return this.clientes.actualizar(identidad, dto);
  }

  @Patch(':identidad/estado')
  cambiarEstado(
    @Param('identidad') identidad: string,
    @Body() dto: CambiarEstadoDto,
  ): Promise<ClienteDto> {
    return this.clientes.cambiarEstado(identidad, dto.activo);
  }
}
