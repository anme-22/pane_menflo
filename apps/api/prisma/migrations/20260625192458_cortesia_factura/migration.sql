-- AlterTable
ALTER TABLE "factura" ADD COLUMN     "motivo_cortesia" VARCHAR(300);

-- AlterTable
ALTER TABLE "factura_detalle" ADD COLUMN     "es_cortesia" BOOLEAN NOT NULL DEFAULT false;
