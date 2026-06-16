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
  rol: RolUsuario;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

/** Cuerpo de la petición de login. */
export interface LoginRequest {
  email: string;
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
  password?: string;
  rol?: RolUsuario;
}

/** Contenido (claims) del JWT de acceso. */
export interface JwtPayload {
  /** subject = id del usuario. */
  sub: number;
  email: string;
  rol: RolUsuario;
}
