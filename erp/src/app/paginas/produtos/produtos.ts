import { Component, ElementRef, computed, inject, linkedSignal, signal, viewChild } from '@angular/core';
import { Icone } from '../../shared/icone';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, map, of, switchMap } from 'rxjs';
import { Orcamento, PedidoOrcamento, ProdutosService } from '../../core/produtos.service';
import { AvisosService } from '../../core/avisos.service';
import { Categoria, Produto, ROTULO_CATEGORIA, ROTULO_UNIDADE, Unidade } from '../../core/modelos';
import { moeda, num } from '../../core/formato';
import { TabelaPrecos } from './tabela-precos';

@Component({
  selector: 'app-produtos',
  imports: [Icone, TabelaPrecos],
  templateUrl: './produtos.html',
  styleUrl: './produtos.css',
})
export class Produtos {
  protected svc = inject(ProdutosService);
  private avisos = inject(AvisosService);
  private campoNome = viewChild<ElementRef<HTMLInputElement>>('campoNome');

  protected readonly moeda = moeda;
  protected readonly num = num;
  protected readonly rotuloCategoria = ROTULO_CATEGORIA;
  protected readonly rotuloUnidade = ROTULO_UNIDADE;
  protected readonly categorias = Object.keys(ROTULO_CATEGORIA) as Categoria[];
  protected readonly unidades = Object.keys(ROTULO_UNIDADE) as Unidade[];

  // ---------- Lista ----------
  protected aba = signal<Categoria | null>(null);
  protected texto = signal('');

  protected contagem = computed(() => {
    const r = {} as Record<Categoria, number>;
    for (const c of this.categorias) r[c] = this.svc.produtos().filter(p => p.categoria === c).length;
    return r;
  });

  protected lista = computed(() => {
    const t = this.texto().trim().toLowerCase();
    return this.svc.produtos().filter(p =>
      (!this.aba() || p.categoria === this.aba()) &&
      (!t || `${p.nome} ${p.descricao}`.toLowerCase().includes(t)),
    );
  });

  // ---------- Formulário (novo / editar) ----------
  protected editandoId = signal<number | null>(null);
  protected fCategoria = signal<Categoria>('ARAME');
  protected fNome = signal('');
  protected fDescricao = signal('');
  protected fUnidade = signal<Unidade>('M2');
  protected fValor = signal(0);
  protected fAtivo = signal(true);
  protected tentouSalvar = signal(false);

  protected nomeInvalido = computed(() => this.fNome().trim().length < 3);
  // Só acessórios têm valor próprio; arame, malha e tipo são cobrados pela tabela de preços
  protected temValorProprio = computed(() => this.fCategoria() === 'ACESSORIOS');
  protected valorInvalido = computed(() => this.temValorProprio() && !(this.fValor() >= 0));

  // ---------- Regras do orçamento ----------
  protected rDesconto = linkedSignal(() => this.svc.regras().descontoAVistaPct);
  protected rParcelas = linkedSignal(() => this.svc.regras().parcelasMax);
  protected regrasInvalidas = computed(() =>
    !(this.rDesconto() >= 0 && this.rDesconto() <= 50) || !(this.rParcelas() >= 1 && this.rParcelas() <= 24),
  );

  // ---------- Prévia no orçamento (calculada pela API, igual ao site) ----------
  // Opções do configurador do site: só as combinações da tabela de preços (telas com produtos ativos)
  private daCategoria(c: Categoria, chaves: Set<string | undefined>): Produto[] {
    return this.svc.ativos().filter(p => p.categoria === c && chaves.has(p.chave));
  }
  protected arames = computed(() => this.daCategoria('ARAME', new Set(this.svc.telasNoSite().map(t => t.arame))));
  protected malhas = computed(() => this.daCategoria('MALHA', new Set(
    this.svc.telasNoSite().filter(t => t.arame === this.sArame()).map(t => t.malha ?? undefined))));
  protected tratamentos = computed(() => this.daCategoria('TRATAMENTO', new Set(
    this.svc.telasNoSite().filter(t => t.arame === this.sArame() && t.malha === this.sMalha()).map(t => t.tratamento))));

  protected sArame = linkedSignal<Produto[], string>({
    source: () => this.arames(), computation: (l, antes) => manterOuPrimeira(l, antes?.value),
  });
  protected sMalha = linkedSignal<Produto[], string>({
    source: () => this.malhas(), computation: (l, antes) => manterOuPrimeira(l, antes?.value),
  });
  protected sTratamento = linkedSignal<Produto[], string>({
    source: () => this.tratamentos(), computation: (l, antes) => manterOuPrimeira(l, antes?.value),
  });
  protected sComprimento = signal(50);
  protected sAltura = signal(2);

  protected simulacao = signal<Orcamento | null>(null);
  protected erroSimulacao = signal('');

  private pedidoSimulacao = computed<PedidoOrcamento>(() => {
    // Lê produtos e regras para pedir de novo depois de salvar um preço
    this.svc.produtos();
    this.svc.precos();
    this.svc.regras();
    return {
      arame: this.sArame(), malha: this.sMalha(), tratamento: this.sTratamento(),
      alturaM: this.sAltura() || 0, comprimentoM: this.sComprimento() || 0,
      entrega: false, cep: null,
    };
  });

  constructor() {
    toObservable(this.pedidoSimulacao).pipe(
      debounceTime(250),
      switchMap(pedido => this.svc.orcar(pedido).pipe(
        map(o => ({ o, erro: '' })),
        catchError((e: HttpErrorResponse) => of({
          o: null,
          erro: e.status === 400 ? 'Informe altura e comprimento.'
            : e.status === 422 ? 'Esta combinação não tem preço na tabela (ou um produto está inativo).'
            : 'Não foi possível calcular a prévia agora.',
        })),
      )),
      takeUntilDestroyed(),
    ).subscribe(({ o, erro }) => {
      this.simulacao.set(o);
      this.erroSimulacao.set(erro);
    });
  }

  /** Quantas linhas da tabela de preços usam o produto */
  usoNaTabela(p: Produto): number {
    return this.svc.precos().filter(t => t.arame === p.chave || t.malha === p.chave || t.tratamento === p.chave).length;
  }

  novo(): void {
    this.editandoId.set(null);
    this.fCategoria.set(this.aba() ?? 'ARAME');
    this.fNome.set('');
    this.fDescricao.set('');
    this.fUnidade.set('M2');
    this.fValor.set(0);
    this.fAtivo.set(true);
    this.tentouSalvar.set(false);
    this.focarNome();
  }

  editar(p: Produto): void {
    this.editandoId.set(p.id);
    this.fCategoria.set(p.categoria);
    this.fNome.set(p.nome);
    this.fDescricao.set(p.descricao);
    this.fUnidade.set(p.unidade);
    this.fValor.set(p.valor);
    this.fAtivo.set(p.ativo);
    this.tentouSalvar.set(false);
    this.focarNome();
  }

  /** Edição só com os dados do banco carregados, para não sobrescrever com valores antigos. */
  protected podeEditar = computed(() => this.svc.estado() === 'ok');
  protected salvando = signal(false);

  async salvar(): Promise<void> {
    this.tentouSalvar.set(true);
    if (this.nomeInvalido() || this.valorInvalido() || this.salvando() || !this.podeEditar()) return;
    const id = this.editandoId();
    this.salvando.set(true);
    try {
      const salvo = await this.svc.salvar({
        id: id ?? undefined,
        categoria: this.fCategoria(),
        nome: this.fNome().trim(),
        descricao: this.fDescricao().trim(),
        unidade: this.temValorProprio() ? this.fUnidade() : 'M2',
        valor: this.temValorProprio() ? Math.round(this.fValor() * 100) / 100 : (this.fValor() || 0),
        ativo: this.fAtivo(),
      });
      this.avisos.mostrar({
        texto: salvo.categoria === 'ACESSORIOS' || this.usoNaTabela(salvo)
          ? `${salvo.nome} ${id ? 'atualizado' : 'cadastrado'}. O site já usa a mudança.`
          : `${salvo.nome} cadastrado. Para aparecer no site, cadastre o preço dele na Tabela de preços.`,
      });
      this.novo();
    } catch (e) {
      this.avisos.mostrar({ texto: mensagemDoServidor(e, 'Não foi possível salvar o produto. Tente de novo.') });
    } finally {
      this.salvando.set(false);
    }
  }

  async alternarAtivo(p: Produto): Promise<void> {
    try {
      await this.svc.alternarAtivo(p.id);
      this.avisos.mostrar({ texto: `${p.nome} ${p.ativo ? 'desativado' : 'ativado'} no simulador.` });
    } catch (e) {
      this.avisos.mostrar({ texto: mensagemDoServidor(e, `Não foi possível alterar ${p.nome}. Tente de novo.`) });
    }
  }

  // ---------- Excluir ----------
  /** Produto com a confirmação aberta na tabela */
  protected excluindoId = signal<number | null>(null);

  async excluir(p: Produto): Promise<void> {
    if (this.salvando() || !this.podeEditar()) return;
    this.salvando.set(true);
    try {
      await this.svc.excluir(p.id);
      this.excluindoId.set(null);
      if (this.editandoId() === p.id) this.novo();
      this.avisos.mostrar({ texto: `${p.nome} excluído. Já não aparece mais no site.` });
    } catch (e) {
      this.avisos.mostrar({ texto: mensagemDoServidor(e, `Não foi possível excluir ${p.nome}. Tente de novo.`) });
    } finally {
      this.salvando.set(false);
    }
  }

  async salvarRegras(): Promise<void> {
    if (this.regrasInvalidas() || this.salvando() || !this.podeEditar()) return;
    this.salvando.set(true);
    try {
      await this.svc.salvarRegras({ descontoAVistaPct: this.rDesconto(), parcelasMax: Math.round(this.rParcelas()) });
      this.avisos.mostrar({ texto: 'Regras do orçamento salvas. O site já usa as novas condições.' });
    } catch {
      this.avisos.mostrar({ texto: 'Não foi possível salvar as regras. Tente de novo.' });
    } finally {
      this.salvando.set(false);
    }
  }

  valorNumero(e: Event): number {
    return parseFloat(String((e.target as HTMLInputElement).value).replace(',', '.'));
  }

  private focarNome(): void {
    setTimeout(() => {
      const el = this.campoNome()?.nativeElement;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus({ preventScroll: true });
    });
  }
}

/** Mensagem do backend quando ele recusa (ex.: deixaria o site sem nenhum arame ativo). */
function mensagemDoServidor(e: unknown, padrao: string): string {
  const erro = e instanceof HttpErrorResponse ? e.error : null;
  return erro?.timestamp && typeof erro.message === 'string' && erro.message ? erro.message : padrao;
}

/** Mantém a opção escolhida se ela ainda existe; senão, a primeira da lista. */
function manterOuPrimeira(lista: Produto[], escolhida: string | undefined): string {
  return lista.some(p => p.chave === escolhida) ? escolhida! : lista[0]?.chave ?? '';
}
