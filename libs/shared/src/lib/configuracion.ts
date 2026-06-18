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
