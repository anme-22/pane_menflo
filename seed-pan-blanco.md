# Seed de demo — Pan Blanco (datos reales)

Este archivo tiene dos partes: (1) los datos reales que acordamos, como referencia, y (2) el
prompt listo para pegar en Claude Code para que genere el seed.

> Orden: corre este seed **después** de mergear la mejora `feature/costos-indirectos`
> (el seed siembra costos indirectos, que solo existen tras esa mejora).

---

## 1. Datos reales

**Producto:** Pan Blanco — precio de venta vigente **7.50**.
**Receta:** por **1 quintal**, rendimiento **350 bolsas**.

### Insumos (tipo peso, base gramo) y su costo de compra

| Insumo | Presentación de compra | Precio | Costo unitario |
|---|---|---|---|
| Harina | quintal | 890 | 8.90 / lb |
| Manteca | 50 lb | 930 | 18.60 / lb |
| Azúcar | 40 lb | 480 | 12.00 / lb |
| Sal | quintal (100 lb) | 320 | 3.20 / lb |
| Levadura | 20 lb | 1,615 | 80.75 / lb |
| Preservante | 25 kg | 2,909 | 0.11636 / g |
| Bolsa 8x14 | fardo 100 lb | 2,200 | 22.00 / lb |

### Cantidades de la receta (por quintal)

| Insumo | Cantidad | Aporte al costo |
|---|---|---|
| Harina | 1 quintal | 890.00 |
| Manteca | 5.5 lb | 102.30 |
| Azúcar | 8 lb | 96.00 |
| Sal | 2 lb | 6.40 |
| Levadura | 1 lb | 80.75 |
| Preservante | 57.5 g | 6.69 |
| Bolsa 8x14 | 6 lb | 132.00 |
| **Subtotal materiales** | | **1,314.14** |

### Costos indirectos

| Concepto | Monto | Periodicidad |
|---|---|---|
| Mano de obra | 350 | POR_QUINTAL |
| Luz/agua/gas | 22,000 | POR_MES |
| Parámetro `quintalesPorMes` | 100 | — |

Indirecto por lote = 350 + 22,000 / 100 = **570**.

### Resultado esperado (aprox. por redondeo y el rango 55–60 g)

- Total por quintal ≈ **1,884.14**
- Costo por bolsa ≈ **5.38**
- Ganancia por bolsa ≈ **2.12** (venta 7.50)
- Ganancia mensual (100 quintales) ≈ **74,086**

---

## 2. Prompt para Claude Code

```
Vamos a crear un SEED DE DEMO con datos reales de panadería (pan blanco). Esto va DESPUÉS de
mergear la mejora de costos indirectos.

Antes de escribir código:
1. Lee el CLAUDE.md y respétalo.
2. NO toques el seed base (unidad_medida, sucursal por defecto, super_admin): reutilízalos.
3. El seed debe ser IDEMPOTENTE (re-ejecutable sin duplicar): busca por nombre natural y
   crea o actualiza.
4. Muéstrame primero un resumen corto de lo que vas a sembrar y el costo por bolsa que
   calcularás; espera mi OK antes de correrlo.

Crea un seed de demo (p. ej. prisma/seed-demo.ts con su script npm) que siembre:

INSUMOS (todos tipo peso, base gramo) y UNA compra por insumo que fije su costo y deje stock
holgado (suficiente para producir ~10 quintales). El precio unitario debe quedar EXACTO según
la presentación:
- Harina:      compra en quintal, 890/quintal        (→ 8.90/lb)
- Manteca:     18.60/lb   (presentación real 50 lb = 930)
- Azúcar:      12.00/lb   (40 lb = 480)
- Sal:         3.20/lb    (quintal = 320)
- Levadura:    80.75/lb   (20 lb = 1615)
- Preservante: compra en kilo, 25 kg = 2909           (→ 0.11636/g)
- Bolsa 8x14:  22.00/lb   (fardo 100 lb = 2200)

PRODUCTO:
- "Pan Blanco", activo, con precio vigente 7.50.

RECETA de Pan Blanco (unidadLote "quintal", rendimiento 350), ingredientes:
- Harina: 1 quintal
- Manteca: 5.5 lb
- Azúcar: 8 lb
- Sal: 2 lb
- Levadura: 1 lb
- Preservante: 57.5 g
- Bolsa 8x14: 6 lb

COSTOS INDIRECTOS:
- "Mano de obra": 350, POR_QUINTAL
- "Luz/agua/gas": 22000, POR_MES
- Parámetro quintalesPorMes = 100

VERIFICACIÓN (aprox por redondeo): materiales ≈ 1314.14/quintal, indirectos 570/lote,
total ≈ 1884.14/quintal, costo por bolsa ≈ 5.38, ganancia por bolsa ≈ 2.12. Imprime el
desglose al final del seed para confirmar.

Usa los nombres EXACTOS de tus modelos/campos del schema.prisma y las unidades ya sembradas
(gramo/libra/kilo/quintal); NO crees unidades nuevas. Documenta el seed de demo en la
sección 10 del CLAUDE.md.
```
