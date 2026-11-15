import { Injectable, signal } from '@angular/core';

export interface Aviso {
  texto: string;
  acao?: { rotulo: string; executar: () => void };
}

/** Mensagem rápida no rodapé ("Pedido aprovado • Desfazer"). */
@Injectable({ providedIn: 'root' })
export class AvisosService {
  readonly atual = signal<Aviso | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  mostrar(aviso: Aviso, ms = 6000): void {
    clearTimeout(this.timer);
    this.atual.set(aviso);
    this.timer = setTimeout(() => this.atual.set(null), ms);
  }

  fechar(): void {
    clearTimeout(this.timer);
    this.atual.set(null);
  }
}
