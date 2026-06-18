-- CreateEnum
CREATE TYPE "EstadoProduccion" AS ENUM ('BORRADOR', 'CONFIRMADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- CreateTable
CREATE TABLE "orden_produccion" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "producto_id" INTEGER NOT NULL,
    "receta_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "sacos" DECIMAL(12,2) NOT NULL,
    "bolsas_esperadas" INTEGER NOT NULL,
    "bolsas_reales" INTEGER,
    "costo_del_momento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estado" "EstadoProduccion" NOT NULL DEFAULT 'BORRADOR',
    "motivo_anulacion" VARCHAR(300),
    "confirmada_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orden_produccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento_inventario" (
    "id" SERIAL NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad_base" DECIMAL(18,4) NOT NULL,
    "costo_unitario" DECIMAL(18,6) NOT NULL,
    "orden_produccion_id" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimiento_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orden_produccion_producto_id_idx" ON "orden_produccion"("producto_id");

-- CreateIndex
CREATE INDEX "orden_produccion_estado_idx" ON "orden_produccion"("estado");

-- CreateIndex
CREATE INDEX "movimiento_inventario_insumo_id_sucursal_id_idx" ON "movimiento_inventario"("insumo_id", "sucursal_id");

-- CreateIndex
CREATE INDEX "movimiento_inventario_orden_produccion_id_idx" ON "movimiento_inventario"("orden_produccion_id");

-- AddForeignKey
ALTER TABLE "orden_produccion" ADD CONSTRAINT "orden_produccion_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_produccion" ADD CONSTRAINT "orden_produccion_receta_id_fkey" FOREIGN KEY ("receta_id") REFERENCES "receta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_produccion" ADD CONSTRAINT "orden_produccion_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_orden_produccion_id_fkey" FOREIGN KEY ("orden_produccion_id") REFERENCES "orden_produccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CHECKs de dominio (Feature 7): no se producen 0 sacos ni se mueven cantidades no positivas.
ALTER TABLE "orden_produccion" ADD CONSTRAINT "orden_produccion_sacos_positivo" CHECK ("sacos" > 0);
ALTER TABLE "orden_produccion" ADD CONSTRAINT "orden_produccion_bolsas_esperadas_no_neg" CHECK ("bolsas_esperadas" >= 0);
ALTER TABLE "orden_produccion" ADD CONSTRAINT "orden_produccion_bolsas_reales_no_neg" CHECK ("bolsas_reales" IS NULL OR "bolsas_reales" >= 0);
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_cantidad_positiva" CHECK ("cantidad_base" > 0);
