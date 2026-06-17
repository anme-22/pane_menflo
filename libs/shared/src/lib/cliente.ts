/**
 * Contratos compartidos de Clientes y el lookup del censo (Feature 4).
 * Única fuente de verdad entre la API (NestJS) y la web (Angular).
 */

/**
 * Catálogo de sexo. 1 = Masculino, 2 = Femenino. Se toleran otros códigos
 * (p. ej. 0/9 = no especificado) sin romper el autocompletado: cualquier
 * código distinto de 1/2 se trata como "No especificado".
 */
export const SEXO_MASCULINO = 1;
export const SEXO_FEMENINO = 2;
export const SEXO_NO_ESPECIFICADO = 0;

/** Etiqueta legible de un código de sexo (tolerante a códigos desconocidos). */
export function etiquetaSexo(cod: number | null | undefined): string {
  if (cod === SEXO_MASCULINO) return 'Masculino';
  if (cod === SEXO_FEMENINO) return 'Femenino';
  return 'No especificado';
}

/** Opciones para el select de sexo en la UI. */
export const OPCIONES_SEXO: readonly { label: string; value: number }[] = [
  { label: 'Masculino', value: SEXO_MASCULINO },
  { label: 'Femenino', value: SEXO_FEMENINO },
  { label: 'No especificado', value: SEXO_NO_ESPECIFICADO },
];

/** Cliente tal como lo expone la API. */
export interface ClienteDto {
  identidad: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  /** Código de sexo (1/2/otros). Usa `etiquetaSexo` para mostrarlo. */
  sexo: number;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

/**
 * Resultado del lookup en el censo a partir de una identidad. Incluye las
 * piezas originales del censo y, por conveniencia, `nombre`/`apellido` ya
 * compuestos para volcar directamente al formulario.
 */
export interface CensoLookupDto {
  identidad: string;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  /** Código de sexo del censo (1/2/otros). */
  sexo: number;
  /** primer + segundo nombre (ya compuesto). */
  nombre: string;
  /** primer + segundo apellido (ya compuesto). */
  apellido: string;
}

/** Respuesta del lookup: indica si la identidad está en el censo. */
export interface CensoLookupResponse {
  encontrado: boolean;
  datos: CensoLookupDto | null;
}

/** Crear cliente. La identidad (13 dígitos) es la clave; el sexo es un código. */
export interface CrearClienteRequest {
  identidad: string;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  sexo: number;
}

/** Actualizar cliente (no se cambia la identidad). Todos opcionales. */
export interface ActualizarClienteRequest {
  nombre?: string;
  apellido?: string;
  telefono?: string | null;
  sexo?: number;
}
