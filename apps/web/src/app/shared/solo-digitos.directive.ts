import { Directive, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Restringe un input a SOLO dígitos: al teclear o pegar, elimina cualquier
 * carácter no numérico. Reutilizable en cualquier campo numérico (identidad,
 * teléfono, etc.). Si el input está dentro de un Reactive Form, sincroniza el
 * control para que las validaciones y el `valueChanges` vean el valor limpio.
 *
 * Uso: <input pInputText appSoloDigitos formControlName="identidad" />
 */
@Directive({
  selector: '[appSoloDigitos]',
  standalone: true,
})
export class SoloDigitosDirective {
  private readonly control = inject(NgControl, { optional: true });

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/\D/g, '');
    if (limpio === input.value) {
      return;
    }
    input.value = limpio;
    if (this.control?.control) {
      this.control.control.setValue(limpio, { emitEvent: true });
    }
  }
}
