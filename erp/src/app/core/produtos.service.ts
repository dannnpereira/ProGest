import { Injectable, computed, effect, signal } from '@angular/core';
import { Produto, RegrasOrcamento } from './modelos';
import { PRODUTOS_EXEMPLO, REGRAS_EXEMPLO } from './dados-exemplo';
import { ler, gravar } from './armazenamento';

export interface ConfigSimulacao {
  arameId: number;
  malhaId: number;
  tratamentoId: number;
  comprimentoM: number;
  alturaM: number;
}

export interface ResultadoSimulacao {
  materiaPrima: number;
  acessorios: number;
  bruto: number;
  desconto: number;
  totalAVista: number;
  parcela: number;
}

@Injectable({ providedIn: 'root' })
export class ProdutosService {
  readonly produtos = signal<Produto[]>(ler('produtos', PRODUTOS_EXEMPLO));
  readonly regras = signal<RegrasOrcamento>(ler('regras', REGRAS_EXEMPLO));

  readonly ativos = computed(() => this.produtos().filter(p => p.ativo));

  constructor() {
    effect(() => gravar('produtos', this.produtos()));
    effect(() => gravar('regras', this.regras()));
  }

  porId(id: number): Produto | undefined {
    return this.produtos().find(p => p.id === id);
  }

  salvar(produto: Omit<Produto, 'id'> & { id?: number }): Produto {
    if (produto.id) {
      const atualizado = produto as Produto;
      this.produtos.update(lista => lista.map(p => (p.id === atualizado.id ? atualizado : p)));
      return atualizado;
    }
    const novo: Produto = { ...produto, id: Math.max(0, ...this.produtos().map(p => p.id)) + 1 };
    this.produtos.update(lista => [...lista, novo]);
    return novo;
  }

  alternarAtivo(id: number): void {
    this.produtos.update(lista => lista.map(p => (p.id === id ? { ...p, ativo: !p.ativo } : p)));
  }

  salvarRegras(regras: RegrasOrcamento): void {
    this.regras.set(regras);
  }

  /**
   * Mesmo cálculo do configurador do site:
   * matéria-prima = área (m²) × (arame + malha + tratamento)
   * acessórios    = comprimento × valor por metro linear
   * desconto à vista sobre o total; parcelas sem juros sobre o valor cheio.
   */
  simular(c: ConfigSimulacao): ResultadoSimulacao {
    const area = Math.max(0, c.comprimentoM) * Math.max(0, c.alturaM);
    const valor = (id: number) => this.porId(id)?.valor ?? 0;
    const materiaPrima = area * (valor(c.arameId) + valor(c.malhaId) + valor(c.tratamentoId));
    const acessorio = this.produtos().find(p => p.categoria === 'ACESSORIOS' && p.ativo);
    const acessorios = acessorio ? Math.max(0, c.comprimentoM) * acessorio.valor : 0;
    const bruto = materiaPrima + acessorios;
    const { descontoAVistaPct, parcelasMax } = this.regras();
    const desconto = bruto * (descontoAVistaPct / 100);
    return {
      materiaPrima, acessorios, bruto, desconto,
      totalAVista: bruto - desconto,
      parcela: parcelasMax > 0 ? bruto / parcelasMax : bruto,
    };
  }
}
