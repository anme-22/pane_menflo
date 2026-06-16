import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import type { LoginResponse, UsuarioDto } from '@pane/shared';
import type { Usuario } from '@prisma/client';
import { toUsuarioDto } from '../usuarios/usuario.mapper';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/** Controlador delgado: solo recibe la petición y delega en el servicio. */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Login público: devuelve el access token y el usuario. */
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  /** Devuelve el usuario autenticado (requiere token válido). */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() usuario: Usuario): UsuarioDto {
    return toUsuarioDto(usuario);
  }
}
