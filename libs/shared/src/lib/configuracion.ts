/**
 * Contrato de la configuración del sistema (Feature 9; edición en F12).
 * Hoy el frontend solo la LEE para saber si mostrar ISV/campos fiscales.
 * Importes/tasas como string para no perder precisión decimal.
 */
export interface ConfiguracionDto {
  isvActivo: boolean;
  /** Tasa de ISV (ej. "0.15"); aplica si isvActivo. */
  tasaIsv: string;
  facturacionFiscalActiva: boolean;
  cai: string | null;
  caiRango: string | null;
  caiFechaLimite: string | null;
  pinEdicionActivo: boolean;
}

/**
 * Datos del negocio para el encabezado/pie del ticket impreso. Vienen de
 * variables de entorno (NEGOCIO_*), no de la BD; se vuelven editables desde la
 * UI en la Feature 12 (Configuración). Los opcionales son null si no se definen.
 */
export interface NegocioDto {
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  /** Registro tributario (RTN) del negocio. */
  rtn: string | null;
  /** Mensaje al pie del ticket (ej. "¡Gracias por su compra!"). */
  mensajePie: string | null;
}
