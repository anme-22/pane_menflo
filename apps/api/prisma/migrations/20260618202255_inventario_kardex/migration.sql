-- AlterTable
ALTER TABLE "insumo" ADD COLUMN     "stock_minimo" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "movimiento_inventario" ADD COLUMN     "compra_id" INTEGER;

-- CreateIndex
CREATE INDEX "movimiento_inventario_compra_id_idx" ON "movimiento_inventario"("compra_id");

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill (Feature 8): asienta una ENTRADA por cada compra existente que aún no
-- tenga movimiento, para que el kardex incluya el histórico de compras (F5). Es
-- idempotente (no duplica si ya existe el movimiento de la compra).
INSERT INTO "movimiento_inventario" ("insumo_id", "sucursal_id", "tipo", "cantidad_base", "costo_unitario", "compra_id", "fecha", "creado_en")
SELECT c."insumo_id", c."sucursal_id", 'ENTRADA', c."cantidad_base", c."costo_por_unidad_base", c."id", c."fecha", CURRENT_TIMESTAMP
FROM "compra" c
WHERE NOT EXISTS (
  SELECT 1 FROM "movimiento_inventario" m WHERE m."compra_id" = c."id"
);
