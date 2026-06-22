-- CreateEnum
CREATE TYPE "EstadoCaja" AS ENUM ('ABIERTA', 'CERRADA');

-- CreateEnum
CREATE TYPE "TipoMovimientoCaja" AS ENUM ('INGRESO', 'EGRESO');

-- CreateTable
CREATE TABLE "caja_sesion" (
    "id" SERIAL NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "estado" "EstadoCaja" NOT NULL DEFAULT 'ABIERTA',
    "monto_inicial" DECIMAL(12,2) NOT NULL,
    "usuario_apertura_id" INTEGER NOT NULL,
    "abierta_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto_contado" DECIMAL(12,2),
    "monto_esperado" DECIMAL(12,2),
    "diferencia" DECIMAL(12,2),
    "usuario_cierre_id" INTEGER,
    "cerrada_en" TIMESTAMP(3),
    "observacion" VARCHAR(300),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caja_sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento_caja" (
    "id" SERIAL NOT NULL,
    "caja_sesion_id" INTEGER NOT NULL,
    "tipo" "TipoMovimientoCaja" NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "concepto" VARCHAR(200) NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimiento_caja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "caja_sesion_sucursal_id_idx" ON "caja_sesion"("sucursal_id");

-- CreateIndex
CREATE INDEX "caja_sesion_estado_idx" ON "caja_sesion"("estado");

-- CreateIndex
CREATE INDEX "movimiento_caja_caja_sesion_id_idx" ON "movimiento_caja"("caja_sesion_id");

-- AddForeignKey
ALTER TABLE "caja_sesion" ADD CONSTRAINT "caja_sesion_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja_sesion" ADD CONSTRAINT "caja_sesion_usuario_apertura_id_fkey" FOREIGN KEY ("usuario_apertura_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja_sesion" ADD CONSTRAINT "caja_sesion_usuario_cierre_id_fkey" FOREIGN KEY ("usuario_cierre_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_caja" ADD CONSTRAINT "movimiento_caja_caja_sesion_id_fkey" FOREIGN KEY ("caja_sesion_id") REFERENCES "caja_sesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_caja" ADD CONSTRAINT "movimiento_caja_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Una sola sesión ABIERTA por sucursal a la vez (índice único PARCIAL).
CREATE UNIQUE INDEX "caja_sesion_una_abierta_por_sucursal"
  ON "caja_sesion" ("sucursal_id")
  WHERE "estado" = 'ABIERTA';

-- Reglas de monto.
ALTER TABLE "caja_sesion"
  ADD CONSTRAINT "caja_sesion_monto_inicial_no_neg" CHECK ("monto_inicial" >= 0),
  ADD CONSTRAINT "caja_sesion_monto_contado_no_neg" CHECK ("monto_contado" IS NULL OR "monto_contado" >= 0);

ALTER TABLE "movimiento_caja"
  ADD CONSTRAINT "movimiento_caja_monto_pos" CHECK ("monto" > 0);
