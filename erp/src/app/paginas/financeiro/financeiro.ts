import { Component, computed, inject, signal } from '@angular/core';
import { Icone } from '../../shared/icone';
import { FinanceiroService } from '../../core/financeiro.service';
import { AvisosService } from '../../core/avisos.service';
import { StatusCompra } from '../../core/modelos';
import { data, diaMes, isoDia, mesCurto, moeda, moedaCompacta, nomeMes, num } from '../../core/formato';

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
  host: { '(document:keydown.escape)': 'modalAberto.set(false)' },
})
export class Financeiro {
  protected svc = inject(FinanceiroService);
  private avisos = inject(AvisosService);

  protected readonly moeda = moeda;
  protected readonly nomeMes = nomeMes;
  protected readonly diaMes = diaMes;
  protected readonly data = data;
  protected readonly num = num;
  protected readonly G = G;

  protected readonly rotuloStatus: Record<StatusCompra, string> = { PAGO: 'Pago', A_PAGAR: 'A pagar', ATRASADO: 'Atrasado' };

  // ---------- Indicadores ----------
  protected variacaoVendas = computed(() => {
    const ant = this.svc.resumoAnterior();
    return ant ? ((this.svc.resumo().vendas - ant.vendas) / ant.vendas) * 100 : null;
  });
  protected saldo = computed(() => this.svc.resumo().entradas - this.svc.resumo().saidas);
  protected mediaSaidas = computed(() => {
    const r = this.svc.resumos();
    return r.reduce((s, x) => s + x.saidas, 0) / r.length;
  });
  protected cobertura = computed(() => this.svc.resumo().entradas / this.svc.resumo().saidas);

  // ---------- Gráfico ----------
  protected visaoGrafico = signal<'grafico' | 'tabela'>('grafico');
  protected hover = signal<string | null>(null);

  protected escala = computed(() => {
    const max = Math.max(...this.svc.resumos().flatMap(r => [r.entradas, r.saidas]));
    const passo = max > 150000 ? 50000 : 25000;
    const topo = Math.ceil(max / passo) * passo;
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

  // ---------- Fornecedores ----------
  protected maiorFornecedor = computed(() => this.svc.fornecedores()[0]?.total ?? 1);
  protected totalFornecedores = computed(() => this.svc.fornecedores().reduce((s, f) => s + f.total, 0));
  protected totalCompras = computed(() => this.svc.compras().reduce((s, c) => s + c.valor, 0));

  // ---------- Registrar compra ----------
  protected modalAberto = signal(false);
  protected tentou = signal(false);
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

  abrirModal(): void {
    const hoje = isoDia();
    this.cData.set(hoje.startsWith(this.svc.mes()) ? hoje : `${this.svc.mes()}-01`);
    this.cFornecedor.set('');
    this.cMaterial.set('');
    this.cQuantidade.set('');
    this.cValor.set(NaN);
    this.cStatus.set('A_PAGAR');
    this.tentou.set(false);
    this.modalAberto.set(true);
  }

  registrar(): void {
    this.tentou.set(true);
    if (Object.values(this.erros()).some(Boolean)) return;
    this.svc.registrarCompra({
      data: this.cData(),
      fornecedor: this.cFornecedor().trim(),
      material: this.cMaterial().trim(),
      quantidade: this.cQuantidade().trim() || '—',
      valor: Math.round(this.cValor() * 100) / 100,
      status: this.cStatus(),
    });
    if (this.cData().slice(0, 7) !== this.svc.mes() && this.svc.meses.includes(this.cData().slice(0, 7))) {
      this.svc.mes.set(this.cData().slice(0, 7));
    }
    this.modalAberto.set(false);
    this.avisos.mostrar({ texto: `Compra de ${moeda(this.cValor())} registrada.` });
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

/** Retângulo com as duas pontas de cima arredondadas, apoiado na linha de base. */
function barraArredondada(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}
