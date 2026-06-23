-- AlterTable: identificador alternativo de login (cédula), opcional y único.
ALTER TABLE "usuario" ADD COLUMN "identidad" CHAR(13);

-- CreateIndex: único (Postgres permite varios NULL en un índice único).
CREATE UNIQUE INDEX "usuario_identidad_key" ON "usuario"("identidad");
