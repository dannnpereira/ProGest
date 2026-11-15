import { Component, ElementRef, computed, inject, linkedSignal, signal, viewChild } from '@angular/core';
import { Icone } from '../../shared/icone';
import { ProdutosService } from '../../core/produtos.service';
import { AvisosService } from '../../core/avisos.service';
import { Categoria, Produto, ROTULO_CATEGORIA, ROTULO_UNIDADE, Unidade } from '../../core/modelos';
import { moeda, num } from '../../core/formato';

@Component({
  selector: 'app-produtos',
  imports: [Icone],
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
  protected valorInvalido = computed(() => !(this.fValor() >= 0));

  // ---------- Regras do orçamento ----------
  protected rDesconto = linkedSignal(() => this.svc.regras().descontoAVistaPct);
  protected rParcelas = linkedSignal(() => this.svc.regras().parcelasMax);
  protected regrasInvalidas = computed(() =>
    !(this.rDesconto() >= 0 && this.rDesconto() <= 50) || !(this.rParcelas() >= 1 && this.rParcelas() <= 24),
  );

  // ---------- Prévia no orçamento ----------
  protected arames = computed(() => this.svc.ativos().filter(p => p.categoria === 'ARAME'));
  protected malhas = computed(() => this.svc.ativos().filter(p => p.categoria === 'MALHA'));
  protected tratamentos = computed(() => this.svc.ativos().filter(p => p.categoria === 'TRATAMENTO'));

  protected sArame = linkedSignal(() => this.arames()[0]?.id ?? 0);
  protected sMalha = linkedSignal(() => this.malhas().find(p => p.chave === 'MALHA_3')?.id ?? this.malhas()[0]?.id ?? 0);
  protected sTratamento = linkedSignal(() => this.tratamentos()[0]?.id ?? 0);
  protected sComprimento = signal(50);
  protected sAltura = signal(2);

  protected simulacao = computed(() => this.svc.simular({
    arameId: this.sArame(), malhaId: this.sMalha(), tratamentoId: this.sTratamento(),
    comprimentoM: this.sComprimento() || 0, alturaM: this.sAltura() || 0,
  }));

  nota(p: Produto): string {
    if (p.categoria === 'MALHA' && p.valor === 0) return p.chave === 'MALHA_2' ? 'base padrão' : 'sem acréscimo';
    if (p.categoria === 'TRATAMENTO') return p.valor === 0 ? 'sem acréscimo' : '+ acréscimo';
    return '';
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

  salvar(): void {
    this.tentouSalvar.set(true);
    if (this.nomeInvalido() || this.valorInvalido()) return;
    const id = this.editandoId();
    const original = id ? this.svc.porId(id) : undefined;
    const salvo = this.svc.salvar({
      ...(original ?? {}),
      id: id ?? undefined,
      categoria: this.fCategoria(),
      nome: this.fNome().trim(),
      descricao: this.fDescricao().trim(),
      unidade: this.fUnidade(),
      valor: Math.round(this.fValor() * 100) / 100,
      ativo: this.fAtivo(),
    });
    this.avisos.mostrar({ texto: `${salvo.nome} ${id ? 'atualizado' : 'cadastrado'}.` });
    this.novo();
  }

  alternarAtivo(p: Produto): void {
    this.svc.alternarAtivo(p.id);
    this.avisos.mostrar({ texto: `${p.nome} ${p.ativo ? 'desativado' : 'ativado'} no simulador.` });
  }

  salvarRegras(): void {
    if (this.regrasInvalidas()) return;
    this.svc.salvarRegras({ descontoAVistaPct: this.rDesconto(), parcelasMax: Math.round(this.rParcelas()) });
    this.avisos.mostrar({ texto: 'Regras do orçamento salvas.' });
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
