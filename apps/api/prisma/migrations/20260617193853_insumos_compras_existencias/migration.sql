-- NOTA: se omite a propósito el DROP/CREATE del índice
-- "grl"."censo_nacional_nombre_idx": Prisma lo re-propone por un detalle de
-- representación de `ops: raw(text_pattern_ops)`, pero el índice ya existe y es
-- correcto; recrearlo sobre ~5M filas sería costoso e innecesario.

-- CreateTable
CREATE TABLE "insumo" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "tipo" "TipoUnidad" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compra" (
    "id" SERIAL NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cantidad_compra" DECIMAL(18,4) NOT NULL,
    "unidad_compra_id" INTEGER NOT NULL,
    "costo" DECIMAL(12,2) NOT NULL,
    "cantidad_base" DECIMAL(18,4) NOT NULL,
    "costo_por_unidad_base" DECIMAL(18,6) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "existencia" (
    "id" SERIAL NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "cantidad_base" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "costo_promedio" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "existencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compra_insumo_id_idx" ON "compra"("insumo_id");

-- CreateIndex
CREATE UNIQUE INDEX "existencia_insumo_id_sucursal_id_key" ON "existencia"("insumo_id", "sucursal_id");

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_unidad_compra_id_fkey" FOREIGN KEY ("unidad_compra_id") REFERENCES "unidad_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "existencia" ADD CONSTRAINT "existencia_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "existencia" ADD CONSTRAINT "existencia_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
