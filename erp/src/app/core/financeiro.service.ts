import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  Compra, ContaReceber, Despesa, Lancamento, Movimentacao, Recebimento, ResumoMes, StatusPedido,
  ROTULO_CATEGORIA_DESPESA, ROTULO_FORMA_PAGAMENTO,
} from './modelos';
import { isoDia, isoMes } from './formato';
import { PedidosService } from './pedidos.service';
import { AvisosService } from './avisos.service';

export interface Fornecedor {
  nome: string;
  total: number;
}

/** Prazo que o cliente tem para pagar, contado da aprovação do pedido */
export const PRAZO_RECEBIMENTO_DIAS = 15;

/** Meses mostrados na tela (o atual e os anteriores) */
const QTD_MESES = 6;

/** Pedidos que viram conta a receber: os aprovados (na produção ou já entregues) */
const FATURADOS: StatusPedido[] = ['A_FAZER', 'EM_PROCESSO', 'ENTREGUE'];

const URL = '/api/erp/financeiro/lancamentos';

type NovaCompra = Omit<Compra, 'id'> & { id?: number };
type NovaDespesa = Omit<Despesa, 'id'> & { id?: number };

/**
 * Financeiro do ERP. Tudo fica no banco:
 *  - compras de material, saídas e vendas diretas: /api/erp/financeiro/lancamentos
 *  - contas a receber: pedidos aprovados do site, com o pagamento gravado no pedido
 * As mudanças aparecem na tela na hora; se o servidor recusar, a lista é recarregada.
 */
@Injectable({ providedIn: 'root' })
export class FinanceiroService {
  private readonly http = inject(HttpClient);
  private readonly pedidosSvc = inject(PedidosService);
  private readonly avisos = inject(AvisosService);

  readonly meses = ultimosMeses(QTD_MESES);
  readonly mes = signal(this.meses[this.meses.length - 1]);

  readonly lancamentos = signal<Lancamento[]>([]);
  readonly estado = signal<'carregando' | 'ok' | 'erro'>('carregando');

  /** Id provisório (negativo) dos lançamentos novos até o servidor responder */
  private provisorio = -1;

  async carregar(silencioso = false): Promise<void> {
    if (!silencioso) this.estado.set('carregando');
    const de = `${this.meses[0]}-01`;
    const ate = isoDia(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
    try {
      const lista = await firstValueFrom(this.http.get<Lancamento[]>(URL, { params: { de, ate } }));
      this.lancamentos.set(lista.map(normalizar));
      this.estado.set('ok');
    } catch {
      if (!silencioso) this.estado.set('erro');
    }
  }

  // ---------- Contas a receber ----------

  readonly contas = computed<ContaReceber[]>(() => {
    const hoje = isoDia();
    return this.pedidosSvc.pedidos()
      .filter(p => FATURADOS.includes(p.status))
      .map(p => {
        const emissao = isoDia(new Date(p.aprovadoEm ?? p.criadoEm));
        const vencimento = somarDias(emissao, PRAZO_RECEBIMENTO_DIAS);
        const recebimento: Recebimento | undefined = p.pagoEm
          ? { data: p.pagoEm, forma: p.formaPagamento ?? 'PIX' }
          : undefined;
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
    this.pedidosSvc.registrarPagamento(pedidoId, rec.data, rec.forma);
  }

  /** Desfaz um pagamento: a conta volta para pendente (ou vencida). Devolve o pagamento desfeito. */
  estornarRecebimento(pedidoId: number): Recebimento | undefined {
    const antes = this.contas().find(c => c.pedidoId === pedidoId)?.recebimento;
    this.pedidosSvc.estornarPagamento(pedidoId);
    return antes;
  }

  private recebidosDoMes(mes: string): ContaReceber[] {
    return this.contas().filter(c => c.recebimento?.data.startsWith(mes));
  }

  // ---------- Compras, saídas e vendas diretas ----------

  private doMes(mes: string, tipo: Lancamento['tipo']): Lancamento[] {
    return this.lancamentos()
      .filter(l => l.tipo === tipo && l.data.startsWith(mes))
      .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
  }

  readonly compras = computed<Compra[]>(() => this.doMes(this.mes(), 'COMPRA').map(paraCompra));
  readonly despesas = computed<Despesa[]>(() => this.doMes(this.mes(), 'DESPESA').map(paraDespesa));

  salvarCompra(c: NovaCompra): void {
    this.salvar({
      id: c.id ?? 0, tipo: 'COMPRA', data: c.data, categoria: null, descricao: c.material,
      favorecido: c.fornecedor, quantidade: c.quantidade, valor: c.valor, status: c.status,
    });
  }

  salvarDespesa(d: NovaDespesa): void {
    this.salvar({
      id: d.id ?? 0, tipo: 'DESPESA', data: d.data, categoria: d.categoria, descricao: d.descricao,
      favorecido: d.favorecido, quantidade: null, valor: d.valor, status: d.status,
    });
  }

  /** Exclui e devolve uma função que desfaz (grava o lançamento de novo). */
  excluirCompra(id: number): () => void { return this.excluir(id); }
  excluirDespesa(id: number): () => void { return this.excluir(id); }

  private salvar(l: Lancamento): void {
    if (l.id > 0) {
      this.lancamentos.update(lista => lista.map(x => (x.id === l.id ? l : x)));
      this.enviar(this.http.put<Lancamento>(`${URL}/${l.id}`, l), l.id, 'salvar o lançamento');
    } else {
      const temp = this.provisorio--;
      this.lancamentos.update(lista => [{ ...l, id: temp }, ...lista]);
      this.enviar(this.http.post<Lancamento>(URL, { ...l, id: null }), temp, 'registrar o lançamento');
    }
  }

  private excluir(id: number): () => void {
    const antes = this.lancamentos().find(l => l.id === id);
    this.lancamentos.update(lista => lista.filter(l => l.id !== id));
    if (id > 0) {
      firstValueFrom(this.http.delete(`${URL}/${id}`)).catch(() => this.falhou('excluir o lançamento'));
    }
    return () => { if (antes) this.salvar({ ...antes, id: 0 }); };
  }

  /** Manda ao servidor e troca o lançamento da tela pelo que foi gravado. */
  private async enviar(req: ReturnType<HttpClient['put']>, idTela: number, acao: string): Promise<void> {
    try {
      const salvo = normalizar((await firstValueFrom(req)) as Lancamento);
      this.lancamentos.update(lista => lista.map(x => (x.id === idTela ? salvo : x)));
    } catch (e) {
      this.falhou(acao, (e as { error?: { message?: string } })?.error?.message);
    }
  }

  private falhou(acao: string, msg?: string): void {
    this.avisos.mostrar({ texto: `Não foi possível ${acao}. ${msg ?? 'Tente de novo.'}` });
    this.carregar(true);
  }

  // ---------- Resumo ----------

  /**
   * Resumo de cada mês, calculado com o que está no banco:
   *  vendas   = pedidos aprovados no mês + vendas diretas
   *  entradas = pedidos pagos no mês + vendas diretas
   *  saídas   = compras de material + saídas do mês (pagas ou não)
   */
  readonly resumos = computed<ResumoMes[]>(() => {
    const pedidos = this.pedidosSvc.pedidos().filter(p => FATURADOS.includes(p.status) && p.aprovadoEm);
    return this.meses.map(mes => {
      const diretas = soma(this.doMes(mes, 'ENTRADA'));
      const aprovados = pedidos
        .filter(p => isoDia(new Date(p.aprovadoEm!)).startsWith(mes))
        .reduce((s, p) => s + p.valorMaterial + p.valorFrete, 0);
      return {
        mes,
        vendas: aprovados + diretas,
        entradas: soma(this.recebidosDoMes(mes)) + diretas,
        saidas: soma(this.doMes(mes, 'COMPRA')) + soma(this.doMes(mes, 'DESPESA')),
      };
    });
  });

  readonly resumo = computed(() => this.resumos().find(r => r.mes === this.mes())!);

  readonly resumoAnterior = computed(() => {
    const i = this.resumos().findIndex(r => r.mes === this.mes());
    return i > 0 ? this.resumos()[i - 1] : undefined;
  });

  /** Extrato do mês: o que entrou e o que já foi pago. */
  readonly movimentacoes = computed<Movimentacao[]>(() => {
    const mes = this.mes();
    const recebidos: Movimentacao[] = this.recebidosDoMes(mes).map(c => ({
      id: `r:${c.pedidoId}`, data: c.recebimento!.data, tipo: 'ENTRADA', valor: c.valor,
      descricao: `Pedido #${c.codigo} recebido`,
      detalhe: `${ROTULO_FORMA_PAGAMENTO[c.recebimento!.forma]} • ${c.cliente}`,
    }));
    const diretas: Movimentacao[] = this.doMes(mes, 'ENTRADA').map(l => ({
      id: `l:${l.id}`, data: l.data, tipo: 'ENTRADA', valor: l.valor,
      descricao: l.descricao, detalhe: l.favorecido ?? 'Venda direta',
    }));
    const compras: Movimentacao[] = this.compras().filter(c => c.status === 'PAGO').map(c => ({
      id: `l:${c.id}`, data: c.data, tipo: 'SAIDA', valor: c.valor,
      descricao: `${c.material} (${c.fornecedor})`, detalhe: 'Compra de material',
    }));
    const despesas: Movimentacao[] = this.despesas().filter(d => d.status === 'PAGO').map(d => ({
      id: `l:${d.id}`, data: d.data, tipo: 'SAIDA', valor: d.valor,
      descricao: d.descricao, detalhe: ROTULO_CATEGORIA_DESPESA[d.categoria],
    }));
    return [...recebidos, ...diretas, ...compras, ...despesas].sort((a, b) => b.data.localeCompare(a.data));
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
}

// ---------- Auxiliares ----------

const soma = (l: { valor: number }[]) => l.reduce((s, x) => s + x.valor, 0);

/** O Java manda os decimais como número/texto; garante number */
function normalizar(l: Lancamento): Lancamento {
  return { ...l, valor: Number(l.valor) };
}

function paraCompra(l: Lancamento): Compra {
  return {
    id: l.id, data: l.data, fornecedor: l.favorecido ?? '—', material: l.descricao,
    quantidade: l.quantidade ?? '—', valor: l.valor, status: l.status,
  };
}

function paraDespesa(l: Lancamento): Despesa {
  return {
    id: l.id, data: l.data, categoria: l.categoria ?? 'OUTROS', descricao: l.descricao,
    favorecido: l.favorecido ?? '—', valor: l.valor, status: l.status,
  };
}

function agrupar<T extends { valor: number }>(lista: T[], chave: (x: T) => string): Fornecedor[] {
  const mapa = new Map<string, number>();
  for (const x of lista) mapa.set(chave(x), (mapa.get(chave(x)) ?? 0) + x.valor);
  return [...mapa].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
}

/** Os últimos n meses (yyyy-mm), do mais antigo ao atual */
function ultimosMeses(n: number): string[] {
  const hoje = new Date();
  return Array.from({ length: n }, (_, i) => isoMes(new Date(hoje.getFullYear(), hoje.getMonth() - (n - 1 - i), 1)));
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
