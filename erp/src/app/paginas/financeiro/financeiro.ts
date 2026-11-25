import { Component, computed, inject, signal } from '@angular/core';
import { Icone } from '../../shared/icone';
import { FinanceiroService, PRAZO_RECEBIMENTO_DIAS } from '../../core/financeiro.service';
import { AvisosService } from '../../core/avisos.service';
import {
  CategoriaDespesa, Compra, ContaReceber, Despesa, FormaPagamento, StatusCompra, StatusConta,
  ROTULO_CATEGORIA_DESPESA, ROTULO_FORMA_PAGAMENTO,
} from '../../core/modelos';
import { data, diaMes, isoDia, mesCurto, moeda, moedaCompacta, nomeMes, num } from '../../core/formato';

type Aba = 'geral' | 'receber' | 'compras' | 'saidas';
type Modal = 'compra' | 'despesa' | 'recebimento';
type FiltroConta = 'ABERTO' | StatusConta | 'TODOS';

// Gráfico: área de desenho em unidades do viewBox
const G = { w: 600, h: 260, esq: 48, dir: 8, topo: 12, base: 28 };

interface Barra {
  mes: string;
  rotulo: string;
  x: number;
  entradas: { y: number; h: number; d: string; valor: number };
  saidas: { y: number; h: number; d: string; valor: number };
  grupoX: number;
  grupoW: number;
}

@Component({
  selector: 'app-financeiro',
  imports: [Icone],
  templateUrl: './financeiro.html',
  styleUrl: './financeiro.css',
  host: { '(document:keydown.escape)': 'modal.set(null)' },
})
export class Financeiro {
  protected svc = inject(FinanceiroService);
  private avisos = inject(AvisosService);

  constructor() {
    // Compras, saídas e vendas diretas vêm do banco; os pedidos já são carregados pelo Layout
    this.svc.carregar();
  }

  protected readonly moeda = moeda;
  protected readonly nomeMes = nomeMes;
  protected readonly diaMes = diaMes;
  protected readonly data = data;
  protected readonly num = num;
  protected readonly G = G;
  protected readonly PRAZO = PRAZO_RECEBIMENTO_DIAS;
  protected readonly hoje = isoDia();

  protected readonly rotuloStatus: Record<StatusCompra, string> = { PAGO: 'Pago', A_PAGAR: 'A pagar', ATRASADO: 'Atrasado' };
  protected readonly statusLista: StatusCompra[] = ['A_PAGAR', 'PAGO', 'ATRASADO'];
  protected readonly rotuloConta: Record<StatusConta, string> = { PENDENTE: 'Pendente', VENCIDO: 'Vencido', PAGO: 'Pago' };
  protected readonly rotuloCategoria = ROTULO_CATEGORIA_DESPESA;
  protected readonly categorias = Object.keys(ROTULO_CATEGORIA_DESPESA) as CategoriaDespesa[];
  protected readonly rotuloForma = ROTULO_FORMA_PAGAMENTO;
  protected readonly formas = Object.keys(ROTULO_FORMA_PAGAMENTO) as FormaPagamento[];

  // ---------- Abas ----------
  protected aba = signal<Aba>('geral');
  /** As abas mensais usam o seletor de mês; Contas a receber mostra todas as contas */
  protected abaMensal = computed(() => this.aba() !== 'receber');

  // ---------- Indicadores ----------
  protected variacaoVendas = computed(() => {
    const ant = this.svc.resumoAnterior();
    return ant && ant.vendas > 0 ? ((this.svc.resumo().vendas - ant.vendas) / ant.vendas) * 100 : null;
  });
  protected saldo = computed(() => this.svc.resumo().entradas - this.svc.resumo().saidas);
  protected mediaSaidas = computed(() => {
    const r = this.svc.resumos();
    return r.reduce((s, x) => s + x.saidas, 0) / r.length;
  });
  /** Quantas vezes as entradas cobrem as saídas (null sem saídas no mês) */
  protected cobertura = computed(() => {
    const r = this.svc.resumo();
    return r.saidas > 0 ? r.entradas / r.saidas : null;
  });

  // ---------- Gráfico ----------
  protected visaoGrafico = signal<'grafico' | 'tabela'>('grafico');
  protected hover = signal<string | null>(null);

  protected escala = computed(() => {
    const max = Math.max(...this.svc.resumos().flatMap(r => [r.entradas, r.saidas]));
    const passo = max > 150000 ? 50000 : 25000;
    const topo = Math.max(passo, Math.ceil(max / passo) * passo);
    const ticks: number[] = [];
    for (let v = 0; v <= topo; v += passo) ticks.push(v);
    return { topo, ticks };
  });

  protected y = (v: number) => {
    const alturaUtil = G.h - G.topo - G.base;
    return G.topo + alturaUtil * (1 - v / this.escala().topo);
  };

  protected barras = computed<Barra[]>(() => {
    const r = this.svc.resumos();
    const largura = G.w - G.esq - G.dir;
    const grupoW = largura / r.length;
    const barraW = Math.min(26, grupoW * 0.28);
    const gap = 2;
    const baseY = G.h - G.base;
    return r.map((m, i) => {
      const cx = G.esq + grupoW * i + grupoW / 2;
      const x1 = cx - barraW - gap / 2;
      const x2 = cx + gap / 2;
      const barra = (x: number, valor: number) => {
        const y = this.y(valor);
        return { y, h: baseY - y, d: barraArredondada(x, y, barraW, baseY - y, 4), valor };
      };
      return {
        mes: m.mes, rotulo: mesCurto(m.mes), x: cx,
        entradas: barra(x1, m.entradas), saidas: barra(x2, m.saidas),
        grupoX: G.esq + grupoW * i, grupoW,
      };
    });
  });

  protected barraHover = computed(() => this.barras().find(b => b.mes === this.hover()) ?? null);

  /** Posição horizontal do tooltip (%), sem deixar sair pelas bordas do gráfico. */
  posicaoTooltip(x: number): number {
    return Math.min(80, Math.max(20, (x / G.w) * 100));
  }

  rotuloEixo(v: number): string {
    return v === 0 ? '0' : `${v / 1000}k`;
  }

  // ---------- Movimentações ----------
  protected extratoCompleto = signal(false);
  protected movimentacoesVisiveis = computed(() =>
    this.extratoCompleto() ? this.svc.movimentacoes() : this.svc.movimentacoes().slice(0, 6),
  );

  // ---------- Filtros das tabelas ----------
  protected filtroCompras = signal<StatusCompra | null>(null);
  protected filtroSaidas = signal<StatusCompra | null>(null);
  protected filtroContas = signal<FiltroConta>('ABERTO');

  protected comprasVisiveis = computed(() => filtrar(this.svc.compras(), this.filtroCompras()));
  protected despesasVisiveis = computed(() => filtrar(this.svc.despesas(), this.filtroSaidas()));

  // ---------- Compras e fornecedores ----------
  protected maiorFornecedor = computed(() => this.svc.fornecedores()[0]?.total ?? 1);
  protected totalFornecedores = computed(() => this.svc.fornecedores().reduce((s, f) => s + f.total, 0));
  protected totalCompras = computed(() => soma(this.comprasVisiveis()));

  // ---------- Saídas ----------
  protected totalDespesas = computed(() => soma(this.despesasVisiveis()));
  protected maiorCategoria = computed(() => this.svc.despesasPorCategoria()[0]?.total ?? 1);
  protected totalCategorias = computed(() => this.svc.despesasPorCategoria().reduce((s, f) => s + f.total, 0));
  protected despesasEmAberto = computed(() => soma(this.svc.despesas().filter(d => d.status !== 'PAGO')));

  // ---------- Contas a receber ----------
  protected contasVisiveis = computed(() => {
    const f = this.filtroContas();
    const contas = this.svc.contas();
    if (f === 'TODOS') return contas;
    if (f === 'ABERTO') return contas.filter(c => c.status !== 'PAGO');
    if (f === 'PAGO') {
      return contas.filter(c => c.status === 'PAGO')
        .sort((a, b) => b.recebimento!.data.localeCompare(a.recebimento!.data));
    }
    return contas.filter(c => c.status === f);
  });
  protected contasResumo = computed(() => {
    const c = this.svc.contas();
    const pend = c.filter(x => x.status === 'PENDENTE');
    const venc = c.filter(x => x.status === 'VENCIDO');
    const semana = pend.filter(x => x.dias <= 7);
    const recebidas = c.filter(x => x.recebimento?.data.startsWith(isoDia().slice(0, 7)));
    return {
      aberto: soma(pend) + soma(venc), qtdAberto: pend.length + venc.length,
      vencido: soma(venc), qtdVencido: venc.length,
      semana: soma(semana), qtdSemana: semana.length,
      recebido: soma(recebidas), qtdRecebido: recebidas.length,
    };
  });
  protected totalContasVisiveis = computed(() => soma(this.contasVisiveis()));

  prazoTexto(c: ContaReceber): string {
    if (c.status === 'PAGO') return `Pago em ${data(c.recebimento!.data)}`;
    if (c.dias === 0) return 'Vence hoje';
    if (c.dias > 0) return `Vence em ${c.dias} dia${c.dias > 1 ? 's' : ''}`;
    return `${-c.dias} dia${c.dias < -1 ? 's' : ''} em atraso`;
  }

  // ---------- Modais ----------
  protected modal = signal<Modal | null>(null);
  protected tentou = signal(false);
  /** Id do lançamento em edição (null = novo) */
  protected editandoId = signal<number | null>(null);
  /** Valor inicial do campo "Valor": só muda ao abrir o modal, para não atrapalhar a digitação */
  protected valorInicial = signal('');

  // Compra
  protected cData = signal(isoDia());
  protected cFornecedor = signal('');
  protected cMaterial = signal('');
  protected cQuantidade = signal('');
  protected cValor = signal<number>(NaN);
  protected cStatus = signal<StatusCompra>('A_PAGAR');

  protected erros = computed(() => ({
    data: !/^\d{4}-\d{2}-\d{2}$/.test(this.cData()),
    fornecedor: this.cFornecedor().trim().length < 2,
    material: this.cMaterial().trim().length < 2,
    valor: !(this.cValor() > 0),
  }));

  protected fornecedoresConhecidos = computed(() => [...new Set(this.svc.compras().map(c => c.fornecedor))]);

  // Despesa
  protected dData = signal(isoDia());
  protected dCategoria = signal<CategoriaDespesa>('OUTROS');
  protected dDescricao = signal('');
  protected dFavorecido = signal('');
  protected dValor = signal<number>(NaN);
  protected dStatus = signal<StatusCompra>('A_PAGAR');

  protected errosDespesa = computed(() => ({
    data: !/^\d{4}-\d{2}-\d{2}$/.test(this.dData()),
    descricao: this.dDescricao().trim().length < 2,
    valor: !(this.dValor() > 0),
  }));

  protected favorecidosConhecidos = computed(() => [...new Set(this.svc.despesas().map(d => d.favorecido))]);

  // Recebimento
  protected rConta = signal<ContaReceber | null>(null);
  protected rData = signal(isoDia());
  protected rForma = signal<FormaPagamento>('PIX');
  protected erroRecebimento = computed(() => !/^\d{4}-\d{2}-\d{2}$/.test(this.rData()) || this.rData() > isoDia());

  private dataPadrao(): string {
    const hoje = isoDia();
    return hoje.startsWith(this.svc.mes()) ? hoje : `${this.svc.mes()}-01`;
  }

  abrirCompra(c?: Compra): void {
    this.editandoId.set(c?.id ?? null);
    this.cData.set(c?.data ?? this.dataPadrao());
    this.cFornecedor.set(c?.fornecedor ?? '');
    this.cMaterial.set(c?.material ?? '');
    this.cQuantidade.set(c && c.quantidade !== '—' ? c.quantidade : '');
    this.cValor.set(c?.valor ?? NaN);
    this.valorInicial.set(c ? String(c.valor) : '');
    this.cStatus.set(c?.status ?? 'A_PAGAR');
    this.tentou.set(false);
    this.modal.set('compra');
  }

  salvarCompra(): void {
    this.tentou.set(true);
    if (Object.values(this.erros()).some(Boolean)) return;
    const id = this.editandoId() ?? undefined;
    this.svc.salvarCompra({
      id,
      data: this.cData(),
      fornecedor: this.cFornecedor().trim(),
      material: this.cMaterial().trim(),
      quantidade: this.cQuantidade().trim() || '—',
      valor: Math.round(this.cValor() * 100) / 100,
      status: this.cStatus(),
    });
    this.irParaMesDe(this.cData());
    this.modal.set(null);
    this.avisos.mostrar({ texto: id ? 'Compra atualizada.' : `Compra de ${moeda(this.cValor())} registrada.` });
  }

  mudarStatusCompra(c: Compra, status: StatusCompra): void {
    this.svc.salvarCompra({ ...c, status });
    this.avisos.mostrar({
      texto: `${c.material}: ${this.rotuloStatus[status].toLowerCase()}.`,
      acao: { rotulo: 'Desfazer', executar: () => this.svc.salvarCompra(c) },
    });
  }

  excluirCompra(c: Compra): void {
    const desfazer = this.svc.excluirCompra(c.id);
    this.avisos.mostrar({ texto: `Compra "${c.material}" excluída.`, acao: { rotulo: 'Desfazer', executar: desfazer } });
  }

  abrirDespesa(d?: Despesa): void {
    this.editandoId.set(d?.id ?? null);
    this.dData.set(d?.data ?? this.dataPadrao());
    this.dCategoria.set(d?.categoria ?? 'OUTROS');
    this.dDescricao.set(d?.descricao ?? '');
    this.dFavorecido.set(d?.favorecido ?? '');
    this.dValor.set(d?.valor ?? NaN);
    this.valorInicial.set(d ? String(d.valor) : '');
    this.dStatus.set(d?.status ?? 'A_PAGAR');
    this.tentou.set(false);
    this.modal.set('despesa');
  }

  salvarDespesa(): void {
    this.tentou.set(true);
    if (Object.values(this.errosDespesa()).some(Boolean)) return;
    const id = this.editandoId() ?? undefined;
    this.svc.salvarDespesa({
      id,
      data: this.dData(),
      categoria: this.dCategoria(),
      descricao: this.dDescricao().trim(),
      favorecido: this.dFavorecido().trim() || '—',
      valor: Math.round(this.dValor() * 100) / 100,
      status: this.dStatus(),
    });
    this.irParaMesDe(this.dData());
    this.modal.set(null);
    this.avisos.mostrar({ texto: id ? 'Saída atualizada.' : `Saída de ${moeda(this.dValor())} registrada.` });
  }

  mudarStatusDespesa(d: Despesa, status: StatusCompra): void {
    this.svc.salvarDespesa({ ...d, status });
    this.avisos.mostrar({
      texto: `${d.descricao}: ${this.rotuloStatus[status].toLowerCase()}.`,
      acao: { rotulo: 'Desfazer', executar: () => this.svc.salvarDespesa(d) },
    });
  }

  excluirDespesa(d: Despesa): void {
    const desfazer = this.svc.excluirDespesa(d.id);
    this.avisos.mostrar({ texto: `Saída "${d.descricao}" excluída.`, acao: { rotulo: 'Desfazer', executar: desfazer } });
  }

  abrirRecebimento(c: ContaReceber): void {
    this.rConta.set(c);
    this.rData.set(isoDia());
    this.rForma.set('PIX');
    this.tentou.set(false);
    this.modal.set('recebimento');
  }

  confirmarRecebimento(): void {
    this.tentou.set(true);
    const c = this.rConta();
    if (!c || this.erroRecebimento()) return;
    this.svc.registrarRecebimento(c.pedidoId, { data: this.rData(), forma: this.rForma() });
    this.modal.set(null);
    this.avisos.mostrar({
      texto: `Pedido #${c.codigo} pago: ${moeda(c.valor)} lançado nas entradas.`,
      acao: { rotulo: 'Desfazer', executar: () => this.svc.estornarRecebimento(c.pedidoId) },
    });
  }

  estornar(c: ContaReceber): void {
    const antes = this.svc.estornarRecebimento(c.pedidoId);
    this.avisos.mostrar({
      texto: `Pagamento do pedido #${c.codigo} estornado. A conta voltou para ${c.dias < 0 ? 'vencidas' : 'pendentes'}.`,
      acao: antes ? { rotulo: 'Desfazer', executar: () => this.svc.registrarRecebimento(c.pedidoId, antes) } : undefined,
    });
  }

  /** Depois de salvar, mostra o mês do lançamento (se ele estiver no período da tela). */
  private irParaMesDe(dia: string): void {
    const mes = dia.slice(0, 7);
    if (mes !== this.svc.mes() && this.svc.meses.includes(mes)) this.svc.mes.set(mes);
  }

  exportar(): void {
    const blob = new Blob([this.svc.csvDoMes()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-financeiro-${this.svc.mes()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  valorNumero(e: Event): number {
    return parseFloat(String((e.target as HTMLInputElement).value).replace(',', '.'));
  }

  compacto(v: number): string {
    return moedaCompacta(v);
  }
}

const soma = (l: { valor: number }[]) => l.reduce((s, x) => s + x.valor, 0);

function filtrar<T extends { status: StatusCompra }>(lista: T[], status: StatusCompra | null): T[] {
  return status ? lista.filter(x => x.status === status) : lista;
}

/** Retângulo com as duas pontas de cima arredondadas, apoiado na linha de base. */
function barraArredondada(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}
