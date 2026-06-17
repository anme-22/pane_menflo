import { Injectable } from '@nestjs/common';
import type { CensoLookupResponse } from '@pane/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toCensoLookupDto } from './cliente.mapper';

/**
 * Lookup en el censo nacional (esquema `grl`, SOLO LECTURA). Dada una identidad
 * devuelve nombres y sexo para autocompletar el formulario de cliente.
 * Esta clase NUNCA escribe en el censo (responsabilidad única, SOLID-S).
 * El código de sexo se devuelve tal cual viene del censo (1/2/otros); la
 * interpretación se hace al mostrar, así se toleran códigos como 0/9.
 */
@Injectable()
export class CensoService {
  constructor(private readonly prisma: PrismaService) {}

  /** Busca una identidad en el censo. `encontrado=false` si no existe. */
  async buscarPorIdentidad(identidad: string): Promise<CensoLookupResponse> {
    const registro = await this.prisma.censoNacional.findUnique({
      where: { identidad },
    });
    if (!registro) {
      return { encontrado: false, datos: null };
    }
    return { encontrado: true, datos: toCensoLookupDto(registro) };
  }
}
