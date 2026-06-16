import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Preset de PrimeNG para la marca de la panadería.
 * El color primario apunta a las MISMAS variables CSS que usa Tailwind
 * (--color-primary-*, definidas en styles.css), de modo que cambiar la paleta
 * en un único lugar actualiza tanto Tailwind como PrimeNG. Hoy: NARANJA.
 */
export const PanePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: 'var(--color-primary-50)',
      100: 'var(--color-primary-100)',
      200: 'var(--color-primary-200)',
      300: 'var(--color-primary-300)',
      400: 'var(--color-primary-400)',
      500: 'var(--color-primary-500)',
      600: 'var(--color-primary-600)',
      700: 'var(--color-primary-700)',
      800: 'var(--color-primary-800)',
      900: 'var(--color-primary-900)',
      950: 'var(--color-primary-950)',
    },
  },
});
