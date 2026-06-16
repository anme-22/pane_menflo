import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

/**
 * Módulo de autenticación. Configura el JWT leyendo el secreto y la expiración
 * desde el entorno (nunca hardcodeados). Exporta nada hacia afuera salvo lo que
 * Passport registra globalmente vía la estrategia.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          // El valor viene de .env (p. ej. "3600s", "1h"); el tipo de la lib
          // espera un literal de `ms`, por eso el cast.
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ??
            '3600s') as `${number}s`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
