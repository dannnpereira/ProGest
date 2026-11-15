// Dados de exemplo baseados na prototipação (Telas 3 a 6).
// Os horários são gerados em relação a "agora" para a tela parecer viva na apresentação.
// Pedidos e produtos já vêm da API; aqui ficam os valores padrão de produtos e o Financeiro.

import { Compra, Movimentacao, Produto, RegrasOrcamento, ResumoMes } from './modelos';
import { isoMes } from './formato';

export const PRODUTOS_EXEMPLO = (): Produto[] => [
  { id: 1, categoria: 'ARAME', nome: 'Fio 12 (2,77 mm)', descricao: 'BWG 12 • Alta resistência', unidade: 'M2', valor: 18, ativo: true, chave: 'FIO_12' },
  { id: 2, categoria: 'ARAME', nome: 'Fio 14 (2,10 mm)', descricao: 'BWG 14 • Padrão comercial', unidade: 'M2', valor: 14, ativo: true, chave: 'FIO_14' },
  { id: 3, categoria: 'MALHA', nome: 'Malha 2" (50 mm)', descricao: 'Losangular padrão quadra', unidade: 'M2', valor: 0, ativo: true, chave: 'MALHA_2' },
  { id: 4, categoria: 'MALHA', nome: 'Malha 3" (75 mm)', descricao: 'Losangular abertura larga', unidade: 'M2', valor: 0, ativo: true, chave: 'MALHA_3' },
  { id: 5, categoria: 'TRATAMENTO', nome: 'Galvanizada a fogo', descricao: 'Zinco pesado NBR 6331', unidade: 'M2', valor: 0, ativo: true, chave: 'GALVANIZADA' },
  { id: 6, categoria: 'TRATAMENTO', nome: 'Revestida em PVC', descricao: 'Proteção ultravioleta verde/azul/cinza', unidade: 'M2', valor: 4, ativo: true, chave: 'PVC' },
  { id: 7, categoria: 'ACESSORIOS', nome: 'Acessórios de fixação (mourões e fixadores)', descricao: 'Kit catracas, parafusos e grampos', unidade: 'METRO_LINEAR', valor: 3.5, ativo: true, chave: 'ACESSORIOS' },
];

export const REGRAS_EXEMPLO = (): RegrasOrcamento => ({ descontoAVistaPct: 5, parcelasMax: 10 });

// ---------------- Financeiro ----------------

/** Últimos 6 meses (o último é o mês atual), valores da prototipação. */
export const RESUMOS_EXEMPLO = (): ResumoMes[] => {
  const base = [
    { vendas: 141200, entradas: 131800, saidas: 92300 },
    { vendas: 152900, entradas: 142600, saidas: 104100 },
    { vendas: 168300, entradas: 155400, saidas: 109800 },
    { vendas: 159100, entradas: 148900, saidas: 101900 },
    { vendas: 165880, entradas: 163700, saidas: 111700 },
    { vendas: 186450, entradas: 172300, saidas: 118900 },
  ];
  const hoje = new Date();
  return base.map((v, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (base.length - 1 - i), 1);
    return { mes: isoMes(d), ...v };
  });
};

const dataNoMes = (mes: string, dia: number) => {
  const [a, m] = mes.split('-').map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  const hoje = new Date();
  // No mês atual, espalha os lançamentos entre o dia 1 e hoje (nada no futuro)
  const d = mes === isoMes(hoje) ? Math.round((dia * hoje.getDate()) / ultimo) : dia;
  return `${mes}-${String(Math.max(1, Math.min(d, ultimo))).padStart(2, '0')}`;
};

/** Movimentações de um mês (geradas a partir do modelo da Tela 6). */
export function movimentacoesDoMes(mes: string, fator: number): Movimentacao[] {
  const r = (v: number) => Math.round((v * fator) / 10) * 10;
  const itens: [number, string, string, Movimentacao['tipo'], number][] = [
    [24, 'Pedido #AM-7820 recebido', 'Transferência TED', 'ENTRADA', 38920],
    [23, 'Compra arame Fio 12 (Nova Era)', 'Boleto bancário', 'SAIDA', 42500],
    [22, 'Pedido #AM-7815 recebido', 'PIX industrial', 'ENTRADA', 68400],
    [21, 'Frete técnico - Caminhão Munck', 'Logística de entrega', 'SAIDA', 4500],
    [20, 'Pedido #AM-7809 (Construtora)', 'Faturamento direto', 'ENTRADA', 14650],
    [19, 'Mourões Sorocaba - 120 unidades', 'Lote de mourões', 'SAIDA', 18200],
    [15, 'Folha de pagamento - produção', 'Salários', 'SAIDA', 24800],
    [10, 'DAS / ICMS do mês', 'Impostos', 'SAIDA', 11300],
    [6, 'Pedido #AM-7790 recebido', 'Boleto compensado', 'ENTRADA', 22350],
  ];
  return itens.map(([dia, descricao, detalhe, tipo, valor], i) => ({
    id: i + 1, data: dataNoMes(mes, dia), descricao, detalhe, tipo, valor: r(valor),
  }));
}

/** Compras de material de um mês (modelo da Tela 6). */
export function comprasDoMes(mes: string, fator: number, mesAtual: boolean): Compra[] {
  const r = (v: number) => Math.round((v * fator) / 100) * 100;
  const itens: [number, string, string, string, number, Compra['status']][] = [
    [23, 'Siderúrgica Nova Era', 'Arame galvanizado a fogo Fio 12', '15 bobinas (4,5 ton)', 42500, 'PAGO'],
    [21, 'Mourões Sorocaba', 'Mourões concreto curvos 2,50 m', '120 unidades', 18200, 'PAGO'],
    [18, 'Gerdau Aços Especiais', 'Arame Fio 14 galvanizado', '8 bobinas (2,4 ton)', 26800, 'A_PAGAR'],
    [15, 'Metalúrgica Fixaço', 'Acessórios de fixação / catracas nº 2', '250 conjuntos', 8400, 'A_PAGAR'],
    [8, 'Arames Brasil Sul', 'Arame revestido PVC verde', '5 bobinas (1,2 ton)', 14100, 'ATRASADO'],
  ];
  return itens.map(([dia, fornecedor, material, quantidade, valor, status], i) => ({
    id: i + 1, data: dataNoMes(mes, dia), fornecedor, material, quantidade,
    valor: r(valor), status: mesAtual ? status : 'PAGO',
  }));
}
