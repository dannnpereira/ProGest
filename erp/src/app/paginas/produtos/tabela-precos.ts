import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Icone } from '../../shared/icone';
import { DadosPreco, ProdutosService } from '../../core/produtos.service';
import { AvisosService } from '../../core/avisos.service';
import { Categoria, PrecoTela, UnidadePreco } from '../../core/modelos';
import { moeda, num } from '../../core/formato';

/** Linha em edição (valores digitados como texto, para aceitar vírgula e campo vazio) */
interface Rascunho {
  arame: string;
  malha: string;
  tratamento: string;
  unidade: UnidadePreco;
  peso: string;
  vista: string;
  prazo: string;
}

/**
 * Tabela de preços da Amaral: preço por combinação de arame + malha + tipo.
 * Telas (m²) viram as opções do site; arame avulso (kg) fica só aqui.
 */
@Component({
  selector: 'app-tabela-precos',
  imports: [Icone, NgTemplateOutlet],
  templateUrl: './tabela-precos.html',
  styleUrl: './tabela-precos.css',
})
export class TabelaPrecos {
  protected svc = inject(ProdutosService);
  private avisos = inject(AvisosService);

  protected readonly moeda = moeda;
  protected readonly num = num;

  protected podeEditar = computed(() => this.svc.estado() === 'ok');
  protected salvando = signal(false);

  // ---------- Filtros ----------
  protected unidade = signal<UnidadePreco>('M2');
  protected tratamento = signal<string | null>(null);

  private daCategoria = (c: Categoria) => computed(() => this.svc.produtos().filter(p => p.categoria === c && p.chave));
  protected arames = this.daCategoria('ARAME');
  protected malhas = this.daCategoria('MALHA');
  protected tratamentos = this.daCategoria('TRATAMENTO');

  /** Tipos que têm alguma linha na unidade escolhida (para os filtros) */
  protected tiposComLinha = computed(() => {
    const usados = new Set(this.svc.precos().filter(p => p.unidade === this.unidade()).map(p => p.tratamento));
    return this.tratamentos().filter(t => usados.has(t.chave!));
  });

  protected lista = computed(() => {
    const ordem = (chave: string | null) => this.svc.produtos().findIndex(p => p.chave === chave);
    return this.svc.precos()
      .filter(p => p.unidade === this.unidade() && (!this.tratamento() || p.tratamento === this.tratamento()))
      .sort((a, b) =>
        ordem(a.tratamento) - ordem(b.tratamento) || ordem(a.arame) - ordem(b.arame) || ordem(a.malha) - ordem(b.malha));
  });

  /** Chaves das telas que aparecem no site agora */
  private noSite = computed(() => new Set(this.svc.telasNoSite().map(t => t.id)));

  nome(chave: string | null): string {
    if (!chave) return '—';
    return this.svc.produtos().find(p => p.chave === chave)?.nome ?? `${chave} (excluído)`;
  }

  estaNoSite(p: PrecoTela): boolean {
    return this.noSite().has(p.id);
  }

  // ---------- Editar / nova linha ----------
  protected editandoId = signal<number | 'novo' | null>(null);
  protected r = signal<Rascunho>(vazio('M2'));
  protected excluindoId = signal<number | null>(null);

  novo(): void {
    const primeiro = (l: { chave?: string }[]) => l[0]?.chave ?? '';
    this.r.set({
      ...vazio(this.unidade()),
      arame: primeiro(this.arames()),
      malha: primeiro(this.malhas()),
      tratamento: this.tratamento() ?? primeiro(this.tratamentos()),
    });
    this.editandoId.set('novo');
  }

  editar(p: PrecoTela): void {
    this.r.set({
      arame: p.arame, malha: p.malha ?? '', tratamento: p.tratamento, unidade: p.unidade,
      peso: p.pesoKgM2 == null ? '' : String(p.pesoKgM2).replace('.', ','),
      vista: String(p.valorVista).replace('.', ','),
      prazo: p.valorPrazo == null ? '' : String(p.valorPrazo).replace('.', ','),
    });
    this.editandoId.set(p.id);
  }

  cancelar(): void {
    this.editandoId.set(null);
  }

  campo(nome: keyof Rascunho, e: Event): void {
    const valor = (e.target as HTMLInputElement | HTMLSelectElement).value;
    this.r.update(x => ({ ...x, [nome]: valor }));
  }

  protected erro = computed(() => {
    const r = this.r();
    const vista = numero(r.vista);
    if (vista === null || vista < 0) return 'Informe o valor à vista.';
    const prazo = numero(r.prazo);
    if (r.prazo.trim() && (prazo === null || prazo < 0)) return 'Valor a prazo inválido.';
    const peso = numero(r.peso);
    if (r.peso.trim() && (peso === null || peso < 0)) return 'Peso inválido.';
    if (r.unidade === 'M2' && !r.malha) return 'Escolha a malha.';
    return '';
  });

  async salvar(): Promise<void> {
    const id = this.editandoId();
    if (id === null || this.erro() || this.salvando() || !this.podeEditar()) return;
    const r = this.r();
    const dados: DadosPreco & { id?: number } = {
      id: id === 'novo' ? undefined : id,
      arame: r.arame,
      malha: r.unidade === 'M2' ? r.malha : null,
      tratamento: r.tratamento,
      unidade: r.unidade,
      pesoKgM2: numero(r.peso),
      valorVista: numero(r.vista)!,
      valorPrazo: numero(r.prazo),
    };
    this.salvando.set(true);
    try {
      await this.svc.salvarPreco(dados);
      this.editandoId.set(null);
      this.avisos.mostrar({ texto: `Preço ${id === 'novo' ? 'cadastrado' : 'atualizado'}. O site já usa o novo valor.` });
    } catch (e) {
      this.avisos.mostrar({ texto: mensagemDoServidor(e, 'Não foi possível salvar o preço. Tente de novo.') });
    } finally {
      this.salvando.set(false);
    }
  }

  async excluir(p: PrecoTela): Promise<void> {
    if (this.salvando() || !this.podeEditar()) return;
    this.salvando.set(true);
    try {
      await this.svc.excluirPreco(p.id);
      this.excluindoId.set(null);
      this.avisos.mostrar({ texto: 'Preço excluído. A combinação saiu do site.' });
    } catch (e) {
      this.avisos.mostrar({ texto: mensagemDoServidor(e, 'Não foi possível excluir o preço. Tente de novo.') });
    } finally {
      this.salvando.set(false);
    }
  }

  trocarUnidade(u: UnidadePreco): void {
    this.unidade.set(u);
    this.tratamento.set(null);
    this.editandoId.set(null);
  }
}

function vazio(unidade: UnidadePreco): Rascunho {
  return { arame: '', malha: '', tratamento: '', unidade, peso: '', vista: '', prazo: '' };
}

/** "47,20" ou "47.20" → 47.2; vazio ou inválido → null */
function numero(texto: string): number | null {
  const t = (texto ?? '').trim().replace(/\s/g, '');
  if (!t) return null;
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return Number.isFinite(n) ? n : null;
}

function mensagemDoServidor(e: unknown, padrao: string): string {
  const erro = e instanceof HttpErrorResponse ? e.error : null;
  return erro?.timestamp && typeof erro.message === 'string' && erro.message ? erro.message : padrao;
}
