import { Component, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  map,
  switchMap,
} from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import {
  OPCIONES_SEXO,
  SEXO_FEMENINO,
  SEXO_MASCULINO,
  SEXO_NO_ESPECIFICADO,
  etiquetaSexo,
  type ActualizarClienteRequest,
  type ClienteDto,
  type CrearClienteRequest,
} from '@pane/shared';
import { SoloDigitosDirective } from '../../shared/solo-digitos.directive';
import { ClientesService } from './clientes.service';

/** Estado del autocompletado contra el censo (para el aviso bajo la identidad). */
type CensoEstado = 'idle' | 'buscando' | 'encontrado' | 'no-encontrado';

/**
 * Gestión de clientes (componente "smart"). Los tres roles pueden gestionar.
 * Al escribir una identidad de 13 dígitos al CREAR, se consulta el censo y se
 * autocompletan nombre, apellido y sexo (editables). No hay borrado: los
 * clientes se activan/desactivan.
 */
@Component({
  selector: 'app-clientes',
  imports: [
    ReactiveFormsModule,
    SoloDigitosDirective,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './clientes.html',
})
export class ClientesPage implements OnInit {
  private readonly service = inject(ClientesService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toast = inject(MessageService);

  // Copia mutable: PrimeNG tipa `[options]` como `any[]` (no readonly).
  protected readonly opcionesSexo = [...OPCIONES_SEXO];

  protected readonly clientes = signal<ClienteDto[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);

  // Diálogo crear/editar.
  protected readonly formVisible = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly censoEstado = signal<CensoEstado>('idle');

  protected readonly form = this.fb.group({
    identidad: ['', [Validators.required, Validators.pattern(/^\d{13}$/)]],
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellido: ['', [Validators.required, Validators.minLength(2)]],
    telefono: [''],
    sexo: [SEXO_NO_ESPECIFICADO as number, [Validators.required]],
  });

  constructor() {
    // Autocompletado: al teclear la identidad (solo al crear) buscamos en el
    // censo de forma desacoplada (debounce + cancelación con switchMap).
    this.form.controls.identidad.valueChanges
      .pipe(
        debounceTime(400),
        map((v) => (v ?? '').trim()),
        distinctUntilChanged(),
        switchMap((identidad) => {
          if (this.editandoId() !== null || !/^\d{13}$/.test(identidad)) {
            this.censoEstado.set('idle');
            return EMPTY;
          }
          this.censoEstado.set('buscando');
          return this.service.lookupCenso(identidad).pipe(
            catchError(() => {
              this.censoEstado.set('idle');
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        if (res.encontrado && res.datos) {
          // El select solo representa 1/2/0; cualquier otro código del censo
          // se normaliza a "No especificado".
          const sexo =
            res.datos.sexo === SEXO_MASCULINO || res.datos.sexo === SEXO_FEMENINO
              ? res.datos.sexo
              : SEXO_NO_ESPECIFICADO;
          this.form.patchValue({
            nombre: res.datos.nombre,
            apellido: res.datos.apellido,
            sexo,
          });
          this.censoEstado.set('encontrado');
        } else {
          this.censoEstado.set('no-encontrado');
        }
      });
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.listar().subscribe({
      next: (data) => {
        this.clientes.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error('No se pudo cargar la lista de clientes.');
      },
    });
  }

  // ---- crear / editar ----

  abrirNuevo(): void {
    this.editandoId.set(null);
    this.censoEstado.set('idle');
    this.form.reset({
      identidad: '',
      nombre: '',
      apellido: '',
      telefono: '',
      sexo: SEXO_NO_ESPECIFICADO,
    });
    this.form.controls.identidad.enable();
    this.formVisible.set(true);
  }

  abrirEdicion(c: ClienteDto): void {
    this.editandoId.set(c.identidad);
    this.censoEstado.set('idle');
    this.form.reset({
      identidad: c.identidad,
      nombre: c.nombre,
      apellido: c.apellido,
      telefono: c.telefono ?? '',
      sexo: c.sexo,
    });
    // La identidad es la clave: no se edita.
    this.form.controls.identidad.disable();
    this.formVisible.set(true);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const id = this.editandoId();
    const v = this.form.getRawValue();

    if (id === null) {
      const data: CrearClienteRequest = {
        identidad: v.identidad,
        nombre: v.nombre,
        apellido: v.apellido,
        telefono: v.telefono || null,
        sexo: v.sexo,
      };
      this.service.crear(data).subscribe({
        next: () => this.alGuardar('Cliente creado.'),
        error: (e) => this.alFallar(e),
      });
    } else {
      const data: ActualizarClienteRequest = {
        nombre: v.nombre,
        apellido: v.apellido,
        telefono: v.telefono || null,
        sexo: v.sexo,
      };
      this.service.actualizar(id, data).subscribe({
        next: () => this.alGuardar('Cliente actualizado.'),
        error: (e) => this.alFallar(e),
      });
    }
  }

  // ---- estado ----

  alternarEstado(c: ClienteDto): void {
    this.service.cambiarEstado(c.identidad, !c.activo).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: c.activo ? 'Cliente desactivado' : 'Cliente activado',
          life: 2500,
        });
        this.cargar();
      },
      error: (e) => this.error(e?.error?.message ?? 'No se pudo cambiar el estado.'),
    });
  }

  // ---- helpers de presentación ----

  sexoTexto(cod: number): string {
    return etiquetaSexo(cod);
  }

  // ---- helpers privados ----

  private alGuardar(mensaje: string): void {
    this.guardando.set(false);
    this.formVisible.set(false);
    this.toast.add({ severity: 'success', summary: mensaje, life: 2500 });
    this.cargar();
  }

  private alFallar(e: { error?: { message?: string } }): void {
    this.guardando.set(false);
    this.error(e?.error?.message ?? 'No se pudo guardar el cliente.');
  }

  private error(detail: string): void {
    this.toast.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
