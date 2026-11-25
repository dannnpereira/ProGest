// Dados de exemplo baseados na prototipação (Telas 3 a 6).
// Os horários são gerados em relação a "agora" para a tela parecer viva na apresentação.
// Pedidos e produtos já vêm da API; aqui ficam os valores padrão de produtos e o Financeiro.

import { Compra, Despesa, Movimentacao, Produto, RegrasOrcamento, ResumoMes } from './modelos';
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

/**
 * Recebimentos de exemplo de um mês (modelo da Tela 6). As saídas do extrato
 * vêm das compras e despesas pagas, e os pedidos do site entram pelas Contas a receber.
 */
export function movimentacoesDoMes(mes: string, fator: number): Movimentacao[] {
  const r = (v: number) => Math.round((v * fator) / 10) * 10;
  const itens: [number, string, string, number][] = [
    [24, 'Pedido #AM-7820 recebido', 'Transferência TED', 38920],
    [22, 'Pedido #AM-7815 recebido', 'PIX industrial', 68400],
    [20, 'Pedido #AM-7809 (Construtora)', 'Faturamento direto', 14650],
    [6, 'Pedido #AM-7790 recebido', 'Boleto compensado', 22350],
  ];
  return itens.map(([dia, descricao, detalhe, valor], i) => ({
    id: `m:${mes}:${i}`, data: dataNoMes(mes, dia), descricao, detalhe, tipo: 'ENTRADA', valor: r(valor),
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
    id: `c:${mes}:${i}`, data: dataNoMes(mes, dia), fornecedor, material, quantidade,
    valor: r(valor), status: mesAtual ? status : 'PAGO',
  }));
}

/**
 * Despesas fixas e operacionais de um mês: folha, encargos, contas de consumo,
 * impostos e frota. Só os gastos que acompanham o movimento da fábrica (energia,
 * DAS, frete, diesel) variam com o mês; os fixos ficam iguais.
 */
export function despesasDoMes(mes: string, fator: number, mesAtual: boolean): Despesa[] {
  const m = Number(mes.slice(5, 7));
  // IPTU parcelado em 10 vezes, de fevereiro a novembro
  const iptu = m >= 2 && m <= 11 ? `IPTU do galpão (parcela ${m - 1}/10)` : null;
  // [dia, categoria, descrição, favorecido, valor, varia com o movimento, status no mês atual]
  const itens: [number, Despesa['categoria'], string | null, string, number, boolean, Despesa['status']][] = [
    [5, 'SALARIOS', 'Salários – equipe de produção (8 funcionários)', 'Folha de pagamento', 24800, false, 'PAGO'],
    [5, 'SALARIOS', 'Salários – administrativo e vendas (3 funcionários)', 'Folha de pagamento', 11400, false, 'PAGO'],
    [7, 'ENCARGOS', 'FGTS dos funcionários', 'Caixa Econômica Federal', 2900, false, 'PAGO'],
    [10, 'ALUGUEL', 'Aluguel do galpão industrial', 'Imobiliária Horizonte', 9500, false, 'PAGO'],
    [12, 'ENERGIA', 'Energia elétrica – teares e solda (trifásica)', 'Distribuidora de energia', 6800, true, 'A_PAGAR'],
    [12, 'AGUA', 'Água e esgoto', 'Saneamento municipal', 520, false, 'PAGO'],
    [15, 'IMPOSTOS', iptu, 'Prefeitura Municipal', 1180, false, 'ATRASADO'],
    [18, 'VEICULOS', 'IPVA da frota – Toco e Truck (provisão mensal)', 'Secretaria da Fazenda', 1650, false, 'PAGO'],
    [20, 'ENCARGOS', 'INSS sobre a folha', 'Receita Federal', 4300, false, 'A_PAGAR'],
    [20, 'IMPOSTOS', 'DAS / ICMS do mês', 'Receita Federal', 11300, true, 'A_PAGAR'],
    [21, 'FRETE', 'Frete técnico – Caminhão Munck', 'Transportes Rodoserra', 4500, true, 'PAGO'],
    [24, 'VEICULOS', 'Diesel da frota', 'Posto Rota 270', 3600, true, 'PAGO'],
    [26, 'OUTROS', 'Internet e telefonia', 'Provedor local', 390, false, 'PAGO'],
  ];
  const despesas: Despesa[] = [];
  itens.forEach(([dia, categoria, descricao, favorecido, valor, varia, status], i) => {
    if (!descricao) return;
    despesas.push({
      id: `d:${mes}:${i}`, data: dataNoMes(mes, dia), categoria, descricao, favorecido,
      valor: varia ? Math.round((valor * fator) / 10) * 10 : valor,
      status: mesAtual ? status : 'PAGO',
    });
  });
  return despesas;
}
