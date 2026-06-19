-- CreateEnum
CREATE TYPE "TipoCostoIndirecto" AS ENUM ('POR_QUINTAL', 'POR_MES');

-- AlterTable
ALTER TABLE "configuracion" ADD COLUMN     "quintales_por_mes" INTEGER NOT NULL DEFAULT 100;

-- CreateTable
CREATE TABLE "costo_indirecto" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "tipo" "TipoCostoIndirecto" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "costo_indirecto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "costo_indirecto_nombre_key" ON "costo_indirecto"("nombre");

-- CHECKs de dominio (mejora de costos indirectos): monto no negativo y
-- quintalesPorMes > 0 (es divisor del prorrateo POR_MES).
ALTER TABLE "costo_indirecto" ADD CONSTRAINT "costo_indirecto_monto_no_neg" CHECK ("monto" >= 0);
ALTER TABLE "configuracion" ADD CONSTRAINT "configuracion_quintales_por_mes_positivo" CHECK ("quintales_por_mes" > 0);
