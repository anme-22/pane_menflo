-- CreateTable
CREATE TABLE "producto" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" VARCHAR(500),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precio_producto" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "vigente_desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigente_hasta" TIMESTAMP(3),

    CONSTRAINT "precio_producto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "precio_producto_producto_id_idx" ON "precio_producto"("producto_id");

-- AddForeignKey
ALTER TABLE "precio_producto" ADD CONSTRAINT "precio_producto_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Integridad de la regla de precios (añadido a mano, ver schema.prisma):
-- (1) Solo puede existir UN precio vigente (vigente_hasta IS NULL) por producto.
CREATE UNIQUE INDEX "precio_producto_un_vigente_por_producto"
    ON "precio_producto" ("producto_id")
    WHERE "vigente_hasta" IS NULL;

-- (2) El precio siempre debe ser positivo.
ALTER TABLE "precio_producto"
    ADD CONSTRAINT "precio_producto_precio_positivo" CHECK ("precio" > 0);
