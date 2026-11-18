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

/** Arame + malha + tratamento com preço na tabela do ProGest (GET /api/catalogo/combinacoes). */
export interface Combinacao {
  arame: string;
  malha: string;
  tratamento: string;
}

/**
 * Opções de arame, malha e tratamento do configurador. Vêm do banco: o que for
 * cadastrado, editado, desativado ou excluído no ProGest muda aqui também.
 * Só aparecem as combinações que têm preço na tabela (ex.: Fio 16 só com malha 3/4" e 1").
 */
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private http = inject(HttpClient);

  readonly itens = signal<ItemCatalogo[]>([]);
  readonly combinacoes = signal<Combinacao[]>([]);
  readonly estado = signal<'carregando' | 'ok' | 'erro'>('carregando');

  readonly arames = computed(() => {
    const usados = new Set(this.combinacoes().map(c => c.arame));
    return this.daCategoria('ARAME').filter(i => usados.has(i.chave));
  });

  async carregar(): Promise<void> {
    this.estado.set('carregando');
    try {
      const [itens, combinacoes] = await Promise.all([
        firstValueFrom(this.http.get<ItemCatalogo[]>('/api/catalogo')),
        firstValueFrom(this.http.get<Combinacao[]>('/api/catalogo/combinacoes')),
      ]);
      this.itens.set(itens);
      this.combinacoes.set(combinacoes);
      this.estado.set('ok');
    } catch {
      this.estado.set('erro');
    }
  }

  /** Malhas que existem para o arame escolhido */
  malhasDo(arame: string): ItemCatalogo[] {
    const usadas = new Set(this.combinacoes().filter(c => c.arame === arame).map(c => c.malha));
    return this.daCategoria('MALHA').filter(i => usadas.has(i.chave));
  }

  /** Tratamentos que existem para o arame e a malha escolhidos */
  tratamentosDe(arame: string, malha: string): ItemCatalogo[] {
    const usados = new Set(
      this.combinacoes().filter(c => c.arame === arame && c.malha === malha).map(c => c.tratamento),
    );
    return this.daCategoria('TRATAMENTO').filter(i => usados.has(i.chave));
  }

  nome(chave: string): string {
    return this.itens().find(i => i.chave === chave)?.nome ?? '';
  }

  private daCategoria(c: CategoriaCatalogo): ItemCatalogo[] {
    return this.itens().filter(i => i.categoria === c);
  }
}
