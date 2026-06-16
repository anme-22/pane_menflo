import { computed, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'pane-theme';

/**
 * Gestiona el tema claro/oscuro (SOLID-S: única responsabilidad).
 * - Alterna la clase `dark` en <html> (la leen Tailwind y PrimeNG).
 * - Persiste la preferencia en localStorage.
 * - Si no hay preferencia guardada, usa `prefers-color-scheme`.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  /** Tema actual como signal reactiva. */
  readonly theme = signal<Theme>(this.resolveInitialTheme());

  /** `true` si el tema actual es oscuro. */
  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    // Aplica el estado inicial de inmediato y luego reacciona a cada cambio.
    this.applyTheme(this.theme());
    effect(() => this.applyTheme(this.theme()));
  }

  /** Alterna entre claro y oscuro. */
  toggle(): void {
    this.theme.update((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  /** Fija un tema concreto. */
  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  private resolveInitialTheme(): Theme {
    const saved = this.readSaved();
    if (saved) {
      return saved;
    }
    // Llamada opcional: matchMedia puede no existir (p. ej. en pruebas/jsdom).
    const prefersDark = this.document.defaultView?.matchMedia?.(
      '(prefers-color-scheme: dark)',
    )?.matches;
    return prefersDark ? 'dark' : 'light';
  }

  private readSaved(): Theme | null {
    try {
      const value = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }

  private applyTheme(theme: Theme): void {
    this.document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* localStorage no disponible: ignorar. */
    }
  }
}
