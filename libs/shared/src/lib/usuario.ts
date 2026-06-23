/**
 * Contratos compartidos de Auth y Usuarios (Feature 2).
 * Única fuente de verdad entre la API (NestJS) y la web (Angular).
 */

/** Roles del sistema (deben coincidir con el enum `RolUsuario` de Prisma). */
export type RolUsuario = 'super_admin' | 'admin' | 'vendedor';

/** Lista de roles válida en runtime (para validaciones y selects de la UI). */
export const ROLES: readonly RolUsuario[] = ['super_admin', 'admin', 'vendedor'];

/** Etiquetas legibles por rol (para mostrar en la UI). */
export const ROL_LABEL: Record<RolUsuario, string> = {
  super_admin: 'Super administrador',
  admin: 'Administrador',
  vendedor: 'Vendedor',
};

/** Usuario tal como lo expone la API. NUNCA incluye el hash de la contraseña. */
export interface UsuarioDto {
  id: number;
  nombre: string;
  email: string;
  /** Identificador alternativo de login (cédula, 13 dígitos) o null. */
  identidad: string | null;
  rol: RolUsuario;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

/** Cuerpo de la petición de login. `identificador` es el correo O la identidad. */
export interface LoginRequest {
  identificador: string;
  password: string;
}

/** Respuesta del login: token de acceso + datos del usuario autenticado. */
export interface LoginResponse {
  accessToken: string;
  usuario: UsuarioDto;
}

/** Datos para crear un usuario (solo super_admin). */
export interface CrearUsuarioRequest {
  nombre: string;
  email: string;
  /** Identidad opcional (13 dígitos); habilita el login por identidad. */
  identidad?: string | null;
  password: string;
  rol: RolUsuario;
}

/**
 * Datos para actualizar un usuario (solo super_admin). Todos opcionales.
 * `password` solo se envía si se quiere cambiar.
 */
export interface ActualizarUsuarioRequest {
  nombre?: string;
  email?: string;
  /** Identidad (13 dígitos) o null para quitarla. */
  identidad?: string | null;
  password?: string;
  rol?: RolUsuario;
}

/** Respuesta del reset de contraseña: la temporal generada (se muestra una vez). */
export interface RestablecerPasswordResponse {
  /** Contraseña temporal en claro. Solo se devuelve aquí, no se guarda en claro. */
  password: string;
}

/** Contenido (claims) del JWT de acceso. */
export interface JwtPayload {
  /** subject = id del usuario. */
  sub: number;
  email: string;
  rol: RolUsuario;
}
