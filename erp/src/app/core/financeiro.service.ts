import { Injectable, computed, effect, signal } from '@angular/core';
import { Compra, Movimentacao, ResumoMes } from './modelos';
import { RESUMOS_EXEMPLO, comprasDoMes, movimentacoesDoMes } from './dados-exemplo';
import { ler, gravar } from './armazenamento';
import { isoMes } from './formato';

export interface Fornecedor {
  nome: string;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class FinanceiroService {
  private readonly base = RESUMOS_EXEMPLO();
  /** Compras lançadas pelo botão "Registrar compra" */
  readonly comprasRegistradas = signal<Compra[]>(ler('compras', () => []));

  readonly meses = this.base.map(r => r.mes);
  readonly mes = signal(this.meses[this.meses.length - 1]);

  constructor() {
    effect(() => gravar('compras', this.comprasRegistradas()));
  }

  /** Resumo de todos os meses, já somando as compras registradas nas saídas. */
  readonly resumos = computed<ResumoMes[]>(() => {
    const extras = this.comprasRegistradas();
    return this.base.map(r => ({
      ...r,
      saidas: r.saidas + extras.filter(c => c.data.startsWith(r.mes)).reduce((s, c) => s + c.valor, 0),
    }));
  });

  readonly resumo = computed(() => this.resumos().find(r => r.mes === this.mes())!);

  readonly resumoAnterior = computed(() => {
    const i = this.resumos().findIndex(r => r.mes === this.mes());
    return i > 0 ? this.resumos()[i - 1] : undefined;
  });

  readonly compras = computed<Compra[]>(() => {
    const mes = this.mes();
    const geradas = comprasDoMes(mes, this.fator(mes), mes === isoMes());
    const registradas = this.comprasRegistradas().filter(c => c.data.startsWith(mes));
    return [...registradas, ...geradas].sort((a, b) => b.data.localeCompare(a.data));
  });

  readonly movimentacoes = computed<Movimentacao[]>(() => {
    const mes = this.mes();
    const registradas: Movimentacao[] = this.comprasRegistradas()
      .filter(c => c.data.startsWith(mes))
      .map(c => ({
        id: 10000 + c.id, data: c.data, descricao: `${c.material} (${c.fornecedor})`,
        detalhe: 'Compra de material', tipo: 'SAIDA', valor: c.valor,
      }));
    return [...registradas, ...movimentacoesDoMes(mes, this.fator(mes))]
      .sort((a, b) => b.data.localeCompare(a.data));
  });

  readonly fornecedores = computed<Fornecedor[]>(() => {
    const mapa = new Map<string, number>();
    for (const c of this.compras()) mapa.set(c.fornecedor, (mapa.get(c.fornecedor) ?? 0) + c.valor);
    return [...mapa].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
  });

  registrarCompra(compra: Omit<Compra, 'id'>): void {
    const id = Math.max(100, ...this.comprasRegistradas().map(c => c.id)) + 1;
    this.comprasRegistradas.update(l => [{ ...compra, id }, ...l]);
  }

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
      ['Compras de material'],
      ['Data', 'Fornecedor', 'Material', 'Quantidade', 'Valor', 'Status'],
      ...this.compras().map(c => [c.data, c.fornecedor, c.material, c.quantidade, c.valor, c.status]),
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
