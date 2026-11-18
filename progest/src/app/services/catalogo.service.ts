import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type CategoriaCatalogo = 'ARAME' | 'MALHA' | 'TRATAMENTO' | 'ACESSORIOS';

/** Opção do configurador, cadastrada no ProGest (GET /api/catalogo). Sem preço. */
export interface ItemCatalogo {
  chave: string;
  categoria: CategoriaCatalogo;
  nome: string;
  descricao: string | null;
}

/**
 * Opções de arame, malha e tratamento do configurador. Vêm do banco: o que for
 * cadastrado, editado, desativado ou excluído no ProGest muda aqui também.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private http = inject(HttpClient);

  readonly itens = signal<ItemCatalogo[]>([]);
  readonly estado = signal<'carregando' | 'ok' | 'erro'>('carregando');

  readonly arames = computed(() => this.daCategoria('ARAME'));
  readonly malhas = computed(() => this.daCategoria('MALHA'));
  readonly tratamentos = computed(() => this.daCategoria('TRATAMENTO'));

  async carregar(): Promise<void> {
    this.estado.set('carregando');
    try {
      this.itens.set(await firstValueFrom(this.http.get<ItemCatalogo[]>('/api/catalogo')));
      this.estado.set('ok');
    } catch {
      this.estado.set('erro');
    }
  }

  nome(chave: string): string {
    return this.itens().find(i => i.chave === chave)?.nome ?? '';
  }

  private daCategoria(c: CategoriaCatalogo): ItemCatalogo[] {
    return this.itens().filter(i => i.categoria === c);
  }
}
