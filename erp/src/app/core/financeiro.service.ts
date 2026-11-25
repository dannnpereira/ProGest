import { Injectable, Signal, WritableSignal, computed, effect, inject, signal } from '@angular/core';
import {
  Compra, ContaReceber, Despesa, Movimentacao, Recebimento, ResumoMes, StatusPedido, StatusCompra,
  ROTULO_CATEGORIA_DESPESA, ROTULO_FORMA_PAGAMENTO,
} from './modelos';
import { RESUMOS_EXEMPLO, comprasDoMes, despesasDoMes, movimentacoesDoMes } from './dados-exemplo';
import { ler, gravar } from './armazenamento';
import { isoDia, isoMes } from './formato';
import { PedidosService } from './pedidos.service';

export interface Fornecedor {
  nome: string;
  total: number;
}

/** Prazo que o cliente tem para pagar, contado da aprovação do pedido */
export const PRAZO_RECEBIMENTO_DIAS = 15;

/** Pedidos que viram conta a receber: os aprovados (na produção ou já entregues) */
const FATURADOS: StatusPedido[] = ['A_FAZER', 'EM_PROCESSO', 'ENTREGUE'];

interface Lancamento {
  id: string;
  data: string;
  valor: number;
  status: StatusCompra;
}

/**
 * Lista editável de lançamentos (compras ou despesas): os de exemplo são gerados
 * para cada mês e o que o usuário muda fica salvo por cima deles ("ajustes"); os
 * lançados na tela ficam em "extras". Tudo é guardado no navegador.
 */
class Lancamentos<T extends Lancamento> {
  private readonly extras: WritableSignal<T[]>;
  private readonly ajustes: WritableSignal<Record<string, T | null>>;
  private readonly originais: T[];
  readonly todos: Signal<T[]>;

  constructor(chave: string, gerados: T[]) {
    this.originais = gerados;
    // Versões antigas gravavam ids numéricos
    this.extras = signal(ler<T[]>(chave, () => []).map(x => ({ ...x, id: String(x.id).includes(':') ? x.id : `u:${x.id}` })));
    this.ajustes = signal(ler<Record<string, T | null>>(`${chave}-ajustes`, () => ({})));
    effect(() => gravar(chave, this.extras()));
    effect(() => gravar(`${chave}-ajustes`, this.ajustes()));

    this.todos = computed(() => {
      const aj = this.ajustes();
      const gerados = this.originais.map(o => (o.id in aj ? aj[o.id] : o)).filter((x): x is T => !!x);
      return [...this.extras(), ...gerados];
    });
  }

  doMes(mes: string): T[] {
    return this.todos().filter(x => x.data.startsWith(mes)).sort((a, b) => b.data.localeCompare(a.data));
  }

  /** Soma dos lançamentos de exemplo originais do mês (base para recalcular as saídas). */
  totalOriginal(mes: string): number {
    return this.originais.filter(x => x.data.startsWith(mes)).reduce((s, x) => s + x.valor, 0);
  }

  /** Cria (sem id) ou atualiza um lançamento. */
  salvar(item: Omit<T, 'id'> & { id?: string }): void {
    if (!item.id) {
      const novo = { ...item, id: `u:${Date.now()}` } as T;
      this.extras.update(l => [novo, ...l]);
    } else if (this.ehExtra(item.id)) {
      this.extras.update(l => l.map(x => (x.id === item.id ? (item as T) : x)));
    } else {
      this.ajustes.update(a => ({ ...a, [item.id!]: item as T }));
    }
  }

  /** Exclui e devolve uma função que desfaz a exclusão. */
  excluir(id: string): () => void {
    if (this.ehExtra(id)) {
      const antes = this.extras();
      this.extras.update(l => l.filter(x => x.id !== id));
      return () => this.extras.set(antes);
    }
    const antes = this.ajustes();
    this.ajustes.update(a => ({ ...a, [id]: null }));
    return () => this.ajustes.set(antes);
  }

  private ehExtra(id: string): boolean {
    return this.extras().some(x => x.id === id);
  }
}

@Injectable({ providedIn: 'root' })
export class FinanceiroService {
  private readonly pedidosSvc = inject(PedidosService);
  private readonly base = RESUMOS_EXEMPLO();

  readonly meses = this.base.map(r => r.mes);
  readonly mes = signal(this.meses[this.meses.length - 1]);

  private readonly comprasLanc = new Lancamentos<Compra>(
    'compras', this.meses.flatMap(m => comprasDoMes(m, this.fator(m), m === isoMes())),
  );
  private readonly despesasLanc = new Lancamentos<Despesa>(
    'despesas', this.meses.flatMap(m => despesasDoMes(m, this.fator(m), m === isoMes())),
  );

  /** Pagamentos dos clientes, por id do pedido */
  readonly recebimentos = signal<Record<number, Recebimento>>(ler('recebimentos', () => ({})));

  constructor() {
    effect(() => gravar('recebimentos', this.recebimentos()));
  }

  // ---------- Contas a receber ----------

  readonly contas = computed<ContaReceber[]>(() => {
    const hoje = isoDia();
    const pagos = this.recebimentos();
    return this.pedidosSvc.pedidos()
      .filter(p => FATURADOS.includes(p.status))
      .map(p => {
        const emissao = isoDia(new Date(p.aprovadoEm ?? p.criadoEm));
        const vencimento = somarDias(emissao, PRAZO_RECEBIMENTO_DIAS);
        const recebimento = pagos[p.id];
        return {
          pedidoId: p.id,
          codigo: p.codigo,
          cliente: p.cliente.nome,
          valor: p.valorMaterial + p.valorFrete,
          emissao,
          vencimento,
          status: recebimento ? 'PAGO' : hoje > vencimento ? 'VENCIDO' : 'PENDENTE',
          dias: diasEntre(hoje, vencimento),
          recebimento,
        } satisfies ContaReceber;
      })
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  });

  registrarRecebimento(pedidoId: number, rec: Recebimento): void {
    this.recebimentos.update(r => ({ ...r, [pedidoId]: rec }));
  }

  /** Desfaz um pagamento: a conta volta para pendente (ou vencida). */
  estornarRecebimento(pedidoId: number): Recebimento | undefined {
    const antes = this.recebimentos()[pedidoId];
    this.recebimentos.update(r => {
      const { [pedidoId]: _, ...resto } = r;
      return resto;
    });
    return antes;
  }

  /** Recebimentos de pedidos pagos dentro do mês */
  private recebidosDoMes(mes: string): ContaReceber[] {
    return this.contas().filter(c => c.recebimento?.data.startsWith(mes));
  }

  // ---------- Compras e despesas ----------

  readonly compras = computed(() => this.comprasLanc.doMes(this.mes()));
  readonly despesas = computed(() => this.despesasLanc.doMes(this.mes()));

  salvarCompra(c: Omit<Compra, 'id'> & { id?: string }): void { this.comprasLanc.salvar(c); }
  excluirCompra(id: string): () => void { return this.comprasLanc.excluir(id); }
  salvarDespesa(d: Omit<Despesa, 'id'> & { id?: string }): void { this.despesasLanc.salvar(d); }
  excluirDespesa(id: string): () => void { return this.despesasLanc.excluir(id); }

  // ---------- Resumo ----------

  /**
   * Resumo de todos os meses. Parte dos valores da prototipação e soma o que mudou:
   * pedidos recebidos entram nas entradas; compras e despesas lançadas, editadas ou
   * excluídas alteram as saídas.
   */
  readonly resumos = computed<ResumoMes[]>(() => {
    return this.base.map(r => {
      const soma = <T extends { valor: number }>(l: T[]) => l.reduce((s, x) => s + x.valor, 0);
      const ajusteSaidas =
        soma(this.comprasLanc.doMes(r.mes)) - this.comprasLanc.totalOriginal(r.mes) +
        soma(this.despesasLanc.doMes(r.mes)) - this.despesasLanc.totalOriginal(r.mes);
      return {
        ...r,
        entradas: r.entradas + soma(this.recebidosDoMes(r.mes)),
        saidas: Math.max(0, r.saidas + ajusteSaidas),
      };
    });
  });

  readonly resumo = computed(() => this.resumos().find(r => r.mes === this.mes())!);

  readonly resumoAnterior = computed(() => {
    const i = this.resumos().findIndex(r => r.mes === this.mes());
    return i > 0 ? this.resumos()[i - 1] : undefined;
  });

  /** Extrato do mês: recebimentos e tudo o que já foi pago. */
  readonly movimentacoes = computed<Movimentacao[]>(() => {
    const mes = this.mes();
    const recebidos: Movimentacao[] = this.recebidosDoMes(mes).map(c => ({
      id: `r:${c.pedidoId}`, data: c.recebimento!.data, tipo: 'ENTRADA', valor: c.valor,
      descricao: `Pedido #${c.codigo} recebido`,
      detalhe: `${ROTULO_FORMA_PAGAMENTO[c.recebimento!.forma]} • ${c.cliente}`,
    }));
    const compras: Movimentacao[] = this.compras().filter(c => c.status === 'PAGO').map(c => ({
      id: c.id, data: c.data, tipo: 'SAIDA', valor: c.valor,
      descricao: `${c.material} (${c.fornecedor})`, detalhe: 'Compra de material',
    }));
    const despesas: Movimentacao[] = this.despesas().filter(d => d.status === 'PAGO').map(d => ({
      id: d.id, data: d.data, tipo: 'SAIDA', valor: d.valor,
      descricao: d.descricao, detalhe: ROTULO_CATEGORIA_DESPESA[d.categoria],
    }));
    return [...recebidos, ...movimentacoesDoMes(mes, this.fator(mes)), ...compras, ...despesas]
      .sort((a, b) => b.data.localeCompare(a.data));
  });

  readonly fornecedores = computed<Fornecedor[]>(() => agrupar(this.compras(), c => c.fornecedor));
  readonly despesasPorCategoria = computed<Fornecedor[]>(() =>
    agrupar(this.despesas(), d => ROTULO_CATEGORIA_DESPESA[d.categoria]),
  );

  /** Gera o CSV do mês selecionado (abre no Excel com acentos corretos). */
  csvDoMes(): string {
    const r = this.resumo();
    const linhas: (string | number)[][] = [
      ['Relatório financeiro', r.mes],
      [],
      ['Total de vendas', r.vendas],
      ['Entradas', r.entradas],
      ['Saídas', r.saidas],
      ['Saldo', r.entradas - r.saidas],
      [],
      ['Movimentações'],
      ['Data', 'Descrição', 'Detalhe', 'Tipo', 'Valor'],
      ...this.movimentacoes().map(m => [m.data, m.descricao, m.detalhe, m.tipo, m.valor]),
      [],
      ['Contas a receber'],
      ['Pedido', 'Cliente', 'Emissão', 'Vencimento', 'Valor', 'Status', 'Pago em'],
      ...this.contas().map(c => [c.codigo, c.cliente, c.emissao, c.vencimento, c.valor, c.status, c.recebimento?.data ?? '']),
      [],
      ['Compras de material'],
      ['Data', 'Fornecedor', 'Material', 'Quantidade', 'Valor', 'Status'],
      ...this.compras().map(c => [c.data, c.fornecedor, c.material, c.quantidade, c.valor, c.status]),
      [],
      ['Saídas'],
      ['Data', 'Categoria', 'Descrição', 'Favorecido', 'Valor', 'Status'],
      ...this.despesas().map(d => [d.data, ROTULO_CATEGORIA_DESPESA[d.categoria], d.descricao, d.favorecido, d.valor, d.status]),
    ];
    const celula = (v: string | number) =>
      typeof v === 'number' ? v.toFixed(2).replace('.', ',') : `"${v.replace(/"/g, '""')}"`;
    return '﻿' + linhas.map(l => l.map(celula).join(';')).join('\r\n');
  }

  /** Escala os valores de exemplo de cada mês proporcionalmente às entradas. */
  private fator(mes: string): number {
    const atual = this.base[this.base.length - 1];
    const r = this.base.find(x => x.mes === mes) ?? atual;
    return r.entradas / atual.entradas;
  }
}

function agrupar<T extends { valor: number }>(lista: T[], chave: (x: T) => string): Fornecedor[] {
  const mapa = new Map<string, number>();
  for (const x of lista) mapa.set(chave(x), (mapa.get(chave(x)) ?? 0) + x.valor);
  return [...mapa].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
}

/** yyyy-mm-dd + n dias */
export function somarDias(iso: string, n: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  return isoDia(new Date(a, m - 1, d + n));
}

/** Dias corridos de "de" até "ate" (ambos yyyy-mm-dd) */
export function diasEntre(de: string, ate: string): number {
  const t = (iso: string) => {
    const [a, m, d] = iso.split('-').map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((t(ate) - t(de)) / 86_400_000);
}
