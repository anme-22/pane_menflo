-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "grl";

-- CreateTable
CREATE TABLE "cliente" (
    "identidad" CHAR(13) NOT NULL,
    "nombre" VARCHAR(101) NOT NULL,
    "apellido" VARCHAR(101) NOT NULL,
    "telefono" VARCHAR(20),
    "sexo" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("identidad")
);

-- CreateTable
CREATE TABLE "grl"."censo_nacional" (
    "identidad" CHAR(13) NOT NULL,
    "primer_nombre" VARCHAR(50) NOT NULL,
    "segundo_nombre" VARCHAR(50),
    "primer_apellido" VARCHAR(50) NOT NULL,
    "segundo_apellido" VARCHAR(50),
    "cod_sexo" INTEGER NOT NULL,
    "fecha_nacimiento" DATE,

    CONSTRAINT "censo_nacional_pkey" PRIMARY KEY ("identidad")
);

-- CreateIndex
CREATE INDEX "censo_nacional_nombre_idx" ON "grl"."censo_nacional"("primer_apellido" text_pattern_ops, "primer_nombre" text_pattern_ops);
