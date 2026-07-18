/**
 * Seed de DEMO — Pan Blanco (datos reales de panadería).
 *
 * Reutiliza el seed base (unidad_medida, sucursal por defecto, super_admin): NO
 * los toca. IDEMPOTENTE: busca por nombre natural y crea/actualiza; la compra de
 * cada insumo se crea solo si aún no existe (no duplica ni borra movimientos).
 *
 * Requiere haber corrido antes: migraciones (incl. costos indirectos) y el seed
 * base (`pnpm prisma:migrate` + `pnpm prisma:seed`).
 *
 * Correr con: `pnpm prisma:seed:demo`
 */
import 'dotenv/config';
import { PrismaClient, TipoUnidad, TipoMovimiento } from '@prisma/client';

const prisma = new PrismaClient();
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const money = (n: number) => `L ${r2(n).toFixed(2)}`;

// Insumos (tipo peso) + UNA compra que fija el costo unitario EXACTO, con stock
// holgado para ~10 quintales. costo total = cantidad × precio de presentación.
const INSUMOS: {
  nombre: string;
  compraUnidad: string;
  compraCantidad: number;
  compraCosto: number;
}[] = [
  { nombre: 'Harina', compraUnidad: 'qq', compraCantidad: 12, compraCosto: 10680 }, // 890/qq → 8.90/lb
  { nombre: 'Manteca', compraUnidad: 'lb', compraCantidad: 100, compraCosto: 1860 }, // 18.60/lb (50 lb = 930)
  { nombre: 'Azúcar', compraUnidad: 'lb', compraCantidad: 120, compraCosto: 1440 }, // 12.00/lb (40 lb = 480)
  { nombre: 'Sal', compraUnidad: 'lb', compraCantidad: 100, compraCosto: 320 }, // 3.20/lb (quintal = 320)
  { nombre: 'Levadura', compraUnidad: 'lb', compraCantidad: 20, compraCosto: 1615 }, // 80.75/lb (20 lb = 1615)
  { nombre: 'Preservante', compraUnidad: 'kg', compraCantidad: 25, compraCosto: 2909 }, // 0.11636/g (25 kg = 2909)
  { nombre: 'Bolsa 8x14', compraUnidad: 'lb', compraCantidad: 100, compraCosto: 2200 }, // 22.00/lb (fardo 100 lb = 2200)
];

// Receta de Pan Blanco: por 1 quintal, rinde 350 bolsas.
const RENDIMIENTO = 350;
const UNIDAD_LOTE = 'quintal';
const PRECIO_VENTA = 7.5;
const INGREDIENTES: { insumo: string; cantidad: number; unidad: string }[] = [
  { insumo: 'Harina', cantidad: 1, unidad: 'qq' },
  { insumo: 'Manteca', cantidad: 5.5, unidad: 'lb' },
  { insumo: 'Azúcar', cantidad: 8, unidad: 'lb' },
  { insumo: 'Sal', cantidad: 2, unidad: 'lb' },
  { insumo: 'Levadura', cantidad: 1, unidad: 'lb' },
  { insumo: 'Preservante', cantidad: 57.5, unidad: 'g' },
  { insumo: 'Bolsa 8x14', cantidad: 6, unidad: 'lb' },
];

const INDIRECTOS: { nombre: string; monto: number; tipo: 'POR_QUINTAL' | 'POR_MES' }[] = [
  { nombre: 'Mano de obra', monto: 350, tipo: 'POR_QUINTAL' },
  { nombre: 'Luz/agua/gas', monto: 22000, tipo: 'POR_MES' },
];
const QUINTALES_POR_MES = 100;

// Clientes de demo para el ambiente de trabajo. Las identidades son REALES del
// censo (grl.censo_nacional), así el autocompletado por identidad calza si cargas
// el censo. sexo: 1 = Masculino, 2 = Femenino (ver catálogo de sexo).
const CLIENTES: {
  identidad: string;
  nombre: string;
  apellido: string;
  telefono: string;
  sexo: number;
}[] = [
  { identidad: '0813196600135', nombre: 'GUADALUPE', apellido: 'MARTINEZ CRUZ', telefono: '9988-1122', sexo: 1 },
  { identidad: '0813196600136', nombre: 'OSCAR ORLANDO', apellido: 'GARCIA SOBALBARRO', telefono: '9871-2233', sexo: 1 },
  { identidad: '0813196600139', nombre: 'RINA FRANCISCA', apellido: 'MARTINEZ AGUILAR', telefono: '9765-3344', sexo: 2 },
  { identidad: '0813196600140', nombre: 'JOSE RUBEN', apellido: 'ARIAS BANEGAS', telefono: '9654-4455', sexo: 1 },
  { identidad: '0813196600141', nombre: 'MARIA VIRGINIA', apellido: 'ARIAS LOPEZ', telefono: '9543-5566', sexo: 2 },
];

async function main() {
  // --- unidades base (ya sembradas; NO se crean) ---
  const unidades = await prisma.unidadMedida.findMany();
  const unidadPorAbrev = new Map(unidades.map((u) => [u.abreviatura, u]));
  const unidad = (abrev: string) => {
    const u = unidadPorAbrev.get(abrev);
    if (!u) throw new Error(`Falta la unidad "${abrev}" (corre el seed base primero).`);
    return u;
  };

  const sucursal = await prisma.sucursal.findFirst({ where: { esDefault: true } });
  if (!sucursal) throw new Error('No hay sucursal por defecto (corre el seed base primero).');
  const sucursalId = sucursal.id;

  // --- insumos + UNA compra por insumo (fija costo y deja stock) ---
  const insumoIdPorNombre = new Map<string, number>();
  for (const ins of INSUMOS) {
    let insumo = await prisma.insumo.findFirst({ where: { nombre: ins.nombre } });
    if (!insumo) {
      insumo = await prisma.insumo.create({
        data: { nombre: ins.nombre, tipo: TipoUnidad.peso },
      });
    }
    insumoIdPorNombre.set(ins.nombre, insumo.id);

    // Compra idempotente: solo si el insumo aún no tiene compras.
    const yaTieneCompra = await prisma.compra.findFirst({ where: { insumoId: insumo.id } });
    if (!yaTieneCompra) {
      const u = unidad(ins.compraUnidad);
      const cantidadBase = ins.compraCantidad * Number(u.factorABase);
      const costoPorUnidadBase = ins.compraCosto / cantidadBase;
      const fecha = new Date();
      await prisma.$transaction(async (tx) => {
        const compra = await tx.compra.create({
          data: {
            insumoId: insumo!.id,
            sucursalId,
            fecha,
            cantidadCompra: ins.compraCantidad,
            unidadCompraId: u.id,
            costo: ins.compraCosto,
            cantidadBase,
            costoPorUnidadBase,
          },
        });
        await tx.existencia.upsert({
          where: { insumoId_sucursalId: { insumoId: insumo!.id, sucursalId } },
          create: { insumoId: insumo!.id, sucursalId, cantidadBase, costoPromedio: costoPorUnidadBase },
          update: { cantidadBase, costoPromedio: costoPorUnidadBase },
        });
        await tx.movimientoInventario.create({
          data: {
            insumoId: insumo!.id,
            sucursalId,
            tipo: TipoMovimiento.ENTRADA,
            cantidadBase,
            costoUnitario: costoPorUnidadBase,
            compraId: compra.id,
            fecha,
          },
        });
      });
    }
  }
  console.log(`✓ Insumos y compras (${INSUMOS.length}).`);

  // --- producto + precio vigente ---
  let producto = await prisma.producto.findFirst({ where: { nombre: 'Pan Blanco' } });
  if (!producto) {
    producto = await prisma.producto.create({ data: { nombre: 'Pan Blanco', activo: true } });
  }
  const precioVigente = await prisma.precioProducto.findFirst({
    where: { productoId: producto.id, vigenteHasta: null },
  });
  if (!precioVigente) {
    await prisma.precioProducto.create({
      data: { productoId: producto.id, precio: PRECIO_VENTA },
    });
  }
  console.log('✓ Producto "Pan Blanco" con precio vigente.');

  // --- receta (reemplaza ingredientes; idempotente) ---
  const ingredientesData = INGREDIENTES.map((ing) => ({
    insumoId: insumoIdPorNombre.get(ing.insumo)!,
    cantidad: ing.cantidad,
    unidadId: unidad(ing.unidad).id,
  }));
  const recetaExistente = await prisma.receta.findUnique({ where: { productoId: producto.id } });
  if (recetaExistente) {
    await prisma.$transaction([
      prisma.receta.update({
        where: { id: recetaExistente.id },
        data: { rendimiento: RENDIMIENTO, unidadLote: UNIDAD_LOTE },
      }),
      prisma.recetaIngrediente.deleteMany({ where: { recetaId: recetaExistente.id } }),
      prisma.recetaIngrediente.createMany({
        data: ingredientesData.map((i) => ({ recetaId: recetaExistente.id, ...i })),
      }),
    ]);
  } else {
    await prisma.receta.create({
      data: {
        productoId: producto.id,
        rendimiento: RENDIMIENTO,
        unidadLote: UNIDAD_LOTE,
        ingredientes: { create: ingredientesData },
      },
    });
  }
  console.log('✓ Receta de Pan Blanco.');

  // --- costos indirectos + parámetro ---
  for (const c of INDIRECTOS) {
    await prisma.costoIndirecto.upsert({
      where: { nombre: c.nombre },
      create: { nombre: c.nombre, monto: c.monto, tipo: c.tipo },
      update: { monto: c.monto, tipo: c.tipo, activo: true },
    });
  }
  const config = await prisma.configuracion.findFirst();
  if (config) {
    await prisma.configuracion.update({
      where: { id: config.id },
      data: { quintalesPorMes: QUINTALES_POR_MES },
    });
  }
  console.log(`✓ Costos indirectos (${INDIRECTOS.length}) y quintalesPorMes = ${QUINTALES_POR_MES}.`);

  // --- clientes de demo (upsert por identidad; NO pisa ediciones del usuario) ---
  for (const c of CLIENTES) {
    await prisma.cliente.upsert({
      where: { identidad: c.identidad },
      create: c,
      update: {},
    });
  }
  console.log(`✓ Clientes de demo (${CLIENTES.length}).`);

  await imprimirDesglose(producto.id, sucursalId, unidad);
}

/** Imprime el desglose de costo tal como lo calcula la app (costoPromedio 6 dp). */
async function imprimirDesglose(
  productoId: number,
  sucursalId: number,
  unidad: (a: string) => { id: number; factorABase: unknown },
) {
  const receta = await prisma.receta.findUnique({
    where: { productoId },
    include: { ingredientes: { include: { insumo: true, unidad: true } } },
  });
  if (!receta) return;

  const existencias = await prisma.existencia.findMany({ where: { sucursalId } });
  const costoPromedio = new Map(existencias.map((e) => [e.insumoId, Number(e.costoPromedio)]));

  console.log('\n──────────── Desglose de costo — Pan Blanco (por quintal) ────────────');
  let materiales = 0;
  for (const ing of receta.ingredientes) {
    const base = Number(ing.cantidad) * Number(ing.unidad.factorABase);
    const cu = costoPromedio.get(ing.insumoId) ?? 0;
    const aporte = base * cu;
    materiales += aporte;
    console.log(
      `  ${ing.insumo.nombre.padEnd(14)} ${String(ing.cantidad).padStart(6)} ${ing.unidad.abreviatura.padEnd(3)} → ${money(aporte)}`,
    );
  }

  const indirectos = await prisma.costoIndirecto.findMany({ where: { activo: true } });
  const cfg = await prisma.configuracion.findFirst();
  const qpm = cfg?.quintalesPorMes ?? 1;
  let indirecto = 0;
  for (const c of indirectos) {
    indirecto += c.tipo === 'POR_MES' ? Number(c.monto) / qpm : Number(c.monto);
  }

  const total = materiales + indirecto;
  const costoPorBolsa = total / receta.rendimiento;
  const precio = await prisma.precioProducto.findFirst({
    where: { productoId, vigenteHasta: null },
  });
  const venta = precio ? Number(precio.precio) : 0;
  const ganancia = venta - costoPorBolsa;

  console.log('  ' + '-'.repeat(50));
  console.log(`  Subtotal materiales        ${money(materiales)}`);
  console.log(`  Indirecto por lote         ${money(indirecto)}  (Σ POR_QUINTAL + Σ POR_MES/${qpm})`);
  console.log(`  TOTAL por quintal          ${money(total)}`);
  console.log(`  Rendimiento                ${receta.rendimiento} bolsas`);
  console.log(`  Costo por bolsa            ${money(costoPorBolsa)}`);
  console.log(`  Precio de venta            ${money(venta)}`);
  console.log(`  Ganancia por bolsa         ${money(ganancia)}`);
  console.log('──────────────────────────────────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('Error en el seed de demo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
