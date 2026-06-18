/**
 * Seed de la base de datos (idempotente — se puede correr varias veces).
 * Carga las variables de entorno (.env) antes de instanciar PrismaClient.
 */
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaClient, RolUsuario, TipoUnidad } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Unidades comunes. `factorABase` = cuánto vale 1 de esta unidad en la unidad
 * base de su tipo (peso -> gramo, volumen -> mililitro).
 */
const unidades: {
  nombre: string;
  abreviatura: string;
  tipo: TipoUnidad;
  factorABase: string;
}[] = [
  // Peso (base = gramo)
  { nombre: 'Gramo', abreviatura: 'g', tipo: TipoUnidad.peso, factorABase: '1' },
  { nombre: 'Onza', abreviatura: 'oz', tipo: TipoUnidad.peso, factorABase: '28.3495' },
  { nombre: 'Libra', abreviatura: 'lb', tipo: TipoUnidad.peso, factorABase: '453.592' },
  { nombre: 'Kilogramo', abreviatura: 'kg', tipo: TipoUnidad.peso, factorABase: '1000' },
  { nombre: 'Quintal', abreviatura: 'qq', tipo: TipoUnidad.peso, factorABase: '45359.2' },
  // Volumen (base = mililitro)
  { nombre: 'Mililitro', abreviatura: 'ml', tipo: TipoUnidad.volumen, factorABase: '1' },
  { nombre: 'Litro', abreviatura: 'L', tipo: TipoUnidad.volumen, factorABase: '1000' },
  // Conteo (base = unidad)
  { nombre: 'Unidad', abreviatura: 'u', tipo: TipoUnidad.conteo, factorABase: '1' },
];

async function main() {
  // Unidades de medida (upsert por nombre, que es único).
  for (const u of unidades) {
    await prisma.unidadMedida.upsert({
      where: { nombre: u.nombre },
      update: { abreviatura: u.abreviatura, tipo: u.tipo, factorABase: u.factorABase },
      create: u,
    });
  }
  console.log(`✓ Unidades de medida sembradas (${unidades.length}).`);

  // Sucursal por defecto: solo se crea si todavía no hay una marcada como default.
  const sucursalDefault = await prisma.sucursal.findFirst({ where: { esDefault: true } });
  if (!sucursalDefault) {
    await prisma.sucursal.create({
      data: { nombre: 'Sucursal Principal', esDefault: true, activa: true },
    });
    console.log('✓ Sucursal por defecto creada ("Sucursal Principal").');
  } else {
    console.log('• Sucursal por defecto ya existente, se omite.');
  }

  // Configuración del sistema: fila única con las banderas (todas apagadas hoy).
  // Solo se crea si aún no existe (no se pisa lo que el admin ajuste luego en F12).
  const yaHayConfig = await prisma.configuracion.findFirst();
  if (!yaHayConfig) {
    await prisma.configuracion.create({ data: {} });
    console.log('✓ Configuración por defecto creada (ISV/fiscal/PIN apagados).');
  } else {
    console.log('• Configuración ya existente, se omite.');
  }

  // Super admin inicial: solo se crea si todavía no existe ningún super_admin.
  // Las credenciales vienen del .env para no hardcodear secretos.
  const yaHaySuperAdmin = await prisma.usuario.findFirst({
    where: { rol: RolUsuario.super_admin },
  });
  if (!yaHaySuperAdmin) {
    const email = process.env.SUPERADMIN_EMAIL;
    const password = process.env.SUPERADMIN_PASSWORD;
    const nombre = process.env.SUPERADMIN_NOMBRE ?? 'Super Admin';

    if (!email || !password) {
      console.warn(
        '⚠ No se sembró super_admin: define SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD en .env',
      );
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.usuario.create({
        data: { nombre, email, passwordHash, rol: RolUsuario.super_admin, activo: true },
      });
      console.log(`✓ Super admin creado (${email}).`);
    }
  } else {
    console.log('• Ya existe un super_admin, se omite.');
  }
}

main()
  .catch((e) => {
    console.error('Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
