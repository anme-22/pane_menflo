-- CreateEnum
CREATE TYPE "EstadoFactura" AS ENUM ('BORRADOR', 'EMITIDA', 'ANULADA');

-- CreateEnum
CREATE TYPE "TipoPago" AS ENUM ('CONTADO', 'CREDITO');

-- CreateTable
CREATE TABLE "configuracion" (
    "id" SERIAL NOT NULL,
    "isv_activo" BOOLEAN NOT NULL DEFAULT false,
    "tasa_isv" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "facturacion_fiscal_activa" BOOLEAN NOT NULL DEFAULT false,
    "cai" VARCHAR(50),
    "cai_rango" VARCHAR(100),
    "cai_fecha_limite" DATE,
    "pin_edicion_activo" BOOLEAN NOT NULL DEFAULT false,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factura" (
    "id" SERIAL NOT NULL,
    "numero" VARCHAR(50),
    "sucursal_id" INTEGER NOT NULL,
    "cliente_identidad" CHAR(13),
    "usuario_id" INTEGER NOT NULL,
    "estado" "EstadoFactura" NOT NULL DEFAULT 'BORRADOR',
    "tipo_pago" "TipoPago" NOT NULL DEFAULT 'CONTADO',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "impuesto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cai" VARCHAR(50),
    "cai_rango" VARCHAR(100),
    "cai_fecha_limite" DATE,
    "motivo_anulacion" VARCHAR(300),
    "emitida_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factura_detalle" (
    "id" SERIAL NOT NULL,
    "factura_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "nombre_producto" VARCHAR(150) NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "tasa_impuesto" DECIMAL(5,4) NOT NULL DEFAULT 0,

    CONSTRAINT "factura_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abono" (
    "id" SERIAL NOT NULL,
    "factura_id" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodo" VARCHAR(30) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abono_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factura_bitacora" (
    "id" SERIAL NOT NULL,
    "factura_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "cuando" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campo" VARCHAR(50) NOT NULL,
    "valor_anterior" VARCHAR(300),
    "valor_nuevo" VARCHAR(300),
    "motivo" VARCHAR(300),

    CONSTRAINT "factura_bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "factura_cliente_identidad_idx" ON "factura"("cliente_identidad");

-- CreateIndex
CREATE INDEX "factura_estado_idx" ON "factura"("estado");

-- CreateIndex
CREATE INDEX "factura_detalle_factura_id_idx" ON "factura_detalle"("factura_id");

-- CreateIndex
CREATE INDEX "abono_factura_id_idx" ON "abono"("factura_id");

-- CreateIndex
CREATE INDEX "factura_bitacora_factura_id_idx" ON "factura_bitacora"("factura_id");

-- AddForeignKey
ALTER TABLE "factura" ADD CONSTRAINT "factura_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura" ADD CONSTRAINT "factura_cliente_identidad_fkey" FOREIGN KEY ("cliente_identidad") REFERENCES "cliente"("identidad") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura" ADD CONSTRAINT "factura_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_detalle" ADD CONSTRAINT "factura_detalle_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "factura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_detalle" ADD CONSTRAINT "factura_detalle_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abono" ADD CONSTRAINT "abono_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "factura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_bitacora" ADD CONSTRAINT "factura_bitacora_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "factura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_bitacora" ADD CONSTRAINT "factura_bitacora_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECKs de dominio (Feature 9): importes no negativos, líneas con cantidad > 0,
-- tasa de impuesto en [0,1] y abonos > 0.
ALTER TABLE "factura" ADD CONSTRAINT "factura_montos_no_neg" CHECK ("subtotal" >= 0 AND "impuesto" >= 0 AND "total" >= 0);
ALTER TABLE "factura_detalle" ADD CONSTRAINT "factura_detalle_cantidad_positiva" CHECK ("cantidad" > 0);
ALTER TABLE "factura_detalle" ADD CONSTRAINT "factura_detalle_precio_no_neg" CHECK ("precio_unitario" >= 0);
ALTER TABLE "factura_detalle" ADD CONSTRAINT "factura_detalle_tasa_valida" CHECK ("tasa_impuesto" >= 0 AND "tasa_impuesto" <= 1);
ALTER TABLE "abono" ADD CONSTRAINT "abono_monto_positivo" CHECK ("monto" > 0);
ALTER TABLE "configuracion" ADD CONSTRAINT "configuracion_tasa_isv_valida" CHECK ("tasa_isv" >= 0 AND "tasa_isv" <= 1);
