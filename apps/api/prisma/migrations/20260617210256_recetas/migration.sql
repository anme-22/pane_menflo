-- CreateTable
CREATE TABLE "receta" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "rendimiento" INTEGER NOT NULL,
    "unidad_lote" VARCHAR(50) NOT NULL DEFAULT 'quintal',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receta_ingrediente" (
    "id" SERIAL NOT NULL,
    "receta_id" INTEGER NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(18,4) NOT NULL,
    "unidad_id" INTEGER NOT NULL,

    CONSTRAINT "receta_ingrediente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "receta_producto_id_key" ON "receta"("producto_id");

-- CreateIndex
CREATE INDEX "receta_ingrediente_receta_id_idx" ON "receta_ingrediente"("receta_id");

-- AddForeignKey
ALTER TABLE "receta" ADD CONSTRAINT "receta_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receta_ingrediente" ADD CONSTRAINT "receta_ingrediente_receta_id_fkey" FOREIGN KEY ("receta_id") REFERENCES "receta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receta_ingrediente" ADD CONSTRAINT "receta_ingrediente_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receta_ingrediente" ADD CONSTRAINT "receta_ingrediente_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "unidad_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK: rendimiento y cantidades positivos (integridad a nivel de BD)
ALTER TABLE "receta" ADD CONSTRAINT "receta_rendimiento_positivo" CHECK ("rendimiento" > 0);
ALTER TABLE "receta_ingrediente" ADD CONSTRAINT "receta_ingrediente_cantidad_positiva" CHECK ("cantidad" > 0);
