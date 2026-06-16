import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

/**
 * Módulo de usuarios. PrismaService llega por el PrismaModule global; los
 * guards de auth se importan donde se usan (no requieren provider extra aquí).
 */
@Module({
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
