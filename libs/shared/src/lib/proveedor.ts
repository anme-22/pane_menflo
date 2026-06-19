/**
 * Contratos compartidos de Proveedores (compras).
 * Única fuente de verdad entre la API (NestJS) y la web (Angular).
 *
 * Un proveedor NO se borra: se desactiva (`activo = false`). El `nombre` es único.
 */

/** Proveedor de insumos tal como lo expone la API. */
export interface ProveedorDto {
  id: number;
  nombre: string;
  telefono: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

/** Crear un proveedor. El nombre debe ser único. */
export interface CrearProveedorRequest {
  nombre: string;
  telefono?: string;
}

/** Actualizar un proveedor (no se borra; el estado se cambia aparte). */
export interface ActualizarProveedorRequest {
  nombre?: string;
  telefono?: string;
}
