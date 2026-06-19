import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ProductosModule } from './productos/productos.module';
import { ClientesModule } from './clientes/clientes.module';
import { UnidadesModule } from './unidades/unidades.module';
import { SucursalesModule } from './sucursales/sucursales.module';
import { InsumosModule } from './insumos/insumos.module';
import { ComprasModule } from './compras/compras.module';
import { RecetasModule } from './recetas/recetas.module';
import { InventarioModule } from './inventario/inventario.module';
import { ProduccionModule } from './produccion/produccion.module';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { ImpuestoModule } from './impuesto/impuesto.module';
import { FacturasModule } from './facturas/facturas.module';
import { ReportesModule } from './reportes/reportes.module';
import { CostosIndirectosModule } from './costos-indirectos/costos-indirectos.module';

@Module({
  imports: [
    // Carga .env (de la raíz del workspace) y expone la config de forma global.
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsuariosModule,
    ProductosModule,
    ClientesModule,
    UnidadesModule,
    SucursalesModule,
    InsumosModule,
    ComprasModule,
    RecetasModule,
    InventarioModule,
    ProduccionModule,
    ConfiguracionModule,
    ImpuestoModule,
    FacturasModule,
    ReportesModule,
    CostosIndirectosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
