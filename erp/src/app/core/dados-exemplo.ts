// Dados de exemplo baseados na prototipação (Telas 3 a 6).
// Os horários são gerados em relação a "agora" para a tela parecer viva na apresentação.
// Quando os endpoints existirem no backend, os serviços passam a buscar daqui -> API.

import { Compra, Movimentacao, Pedido, Produto, RegrasOrcamento, ResumoMes } from './modelos';
import { isoDia, isoMes } from './formato';

const minutosAtras = (min: number) => new Date(Date.now() - min * 60000).toISOString();
const diasAtras = (dias: number, hora = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora, 0, 0, 0);
  return d.toISOString();
};
const diasAFrente = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return isoDia(d);
};

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

export const PEDIDOS_EXEMPLO = (): Pedido[] => [
  // ---- Fila de aprovação (Tela 3) ----
  {
    id: 9410, codigo: 'AM-9410', criadoEm: minutosAtras(28),
    cliente: { nome: 'Construtora Alfa Engenharia S/A', tipo: 'Pessoa jurídica', documento: 'CNPJ 14.892.401/0001-88', cidade: 'Sorocaba', uf: 'SP', telefone: '15991234567' },
    destino: 'Canteiro Rod. Raposo Tavares Km 98',
    fio: 'FIO_12', malha: 'MALHA_2', alturaM: 2, metragemM: 500, tratamentoId: 5, rolos: '50 rolos x 10m',
    frete: { tipo: 'ENTREGA', distanciaKm: 38, descricao: 'Entrega técnica própria • 38 km (Munck)' },
    valorMaterial: 36420, valorFrete: 2500,
    observacao: 'Crédito PJ faturado 28 DDL • Análise Serasa: Score 920 (Aprovado)',
    status: 'AGUARDANDO_APROVACAO',
  },
  {
    id: 9411, codigo: 'AM-9411', criadoEm: minutosAtras(65),
    cliente: { nome: 'Condomínio Residencial Parque dos Ipês', tipo: 'Condomínio fechado', documento: 'CNPJ 28.114.903/0001-04', cidade: 'Campinas', uf: 'SP', telefone: '19992345678' },
    destino: 'Portaria 02 - A/C Administração Predial',
    fio: 'FIO_14', malha: 'MALHA_3', alturaM: 1.8, metragemM: 1200, tratamentoId: 6, rolos: '120 rolos x 10m',
    frete: { tipo: 'ENTREGA', distanciaKm: 74, descricao: 'Entrega técnica própria • 74 km' },
    valorMaterial: 63900, valorFrete: 4500,
    observacao: 'Pagamento via boleto bancário 50% sinal confirmado • Acompanha ART de instalação solicitada',
    status: 'AGUARDANDO_APROVACAO',
  },
  {
    id: 9412, codigo: 'AM-9412', criadoEm: minutosAtras(98),
    cliente: { nome: 'Marcos Aurélio Silveira', tipo: 'Produtor rural (PF)', documento: 'CPF 122.908.438-19', cidade: 'Votorantim', uf: 'SP', telefone: '15993456789' },
    destino: 'Sítio Santa Rita - Bairro dos Morros',
    fio: 'FIO_14', malha: 'MALHA_2', alturaM: 1.5, metragemM: 180, tratamentoId: 5, rolos: '18 rolos x 10m',
    frete: { tipo: 'RETIRADA', descricao: 'Retirada na fábrica (FOB - veículo próprio)' },
    valorMaterial: 6880, valorFrete: 0,
    observacao: 'Pagamento via Pix (comprovante verificado) • Retirada prevista para amanhã após 14h',
    status: 'AGUARDANDO_APROVACAO',
  },
  {
    id: 9413, codigo: 'AM-9413', criadoEm: minutosAtras(120),
    cliente: { nome: 'Agropecuária Vale Verde Ltda', tipo: 'Pessoa jurídica', documento: 'CNPJ 03.541.218/0001-90', cidade: 'Itu', uf: 'SP', telefone: '11994567890' },
    destino: 'Estrada Municipal Itu-Tietê Km 12',
    fio: 'FIO_12', malha: 'MALHA_3', alturaM: 1.8, metragemM: 320, tratamentoId: 5, rolos: '32 rolos x 10m',
    frete: { tipo: 'ENTREGA', distanciaKm: 42, descricao: 'Entrega técnica própria • 42 km' },
    valorMaterial: 13450, valorFrete: 1200,
    observacao: 'Faturamento aprovado 30 dias • Inscrição Estadual ativa (isento de diferencial de alíquota)',
    status: 'AGUARDANDO_APROVACAO',
  },
  {
    id: 9414, codigo: 'AM-9414', criadoEm: minutosAtras(155),
    cliente: { nome: 'LogMais Galpões & Armazéns', tipo: 'Logística e intralogística', documento: 'CNPJ 33.782.910/0002-14', cidade: 'Sorocaba', uf: 'SP', telefone: '15995678901' },
    destino: 'Distrito Industrial - Zona Norte',
    fio: 'FIO_12', malha: 'MALHA_2', alturaM: 2.2, metragemM: 200, tratamentoId: 5, rolos: '20 rolos x 10m',
    frete: { tipo: 'ENTREGA', distanciaKm: 18, descricao: 'Entrega técnica própria • 18 km' },
    valorMaterial: 12350, valorFrete: 1650,
    observacao: 'Cliente com histórico de 6 compras recorrentes • Descarregamento em doca aberta',
    status: 'AGUARDANDO_APROVACAO',
  },

  // ---- Já aprovados / em produção / entregues (tela Produção e Entregas) ----
  {
    id: 9407, codigo: 'AM-9407', criadoEm: diasAtras(1, 15),
    cliente: { nome: 'Clube Atlético Sorocabano', tipo: 'Associação esportiva', documento: 'CNPJ 45.120.330/0001-07', cidade: 'Sorocaba', uf: 'SP', telefone: '15996789012' },
    destino: 'Quadras poliesportivas - Av. Itavuvu, 1200',
    fio: 'FIO_12', malha: 'MALHA_2', alturaM: 4, metragemM: 160, tratamentoId: 6, rolos: '16 rolos x 10m',
    frete: { tipo: 'ENTREGA', distanciaKm: 9, descricao: 'Entrega técnica própria • 9 km' },
    valorMaterial: 25900, valorFrete: 800,
    observacao: 'Pagamento via Pix confirmado',
    status: 'A_FAZER', aprovadoEm: minutosAtras(70), previsaoEntrega: diasAFrente(6),
  },
  {
    id: 9408, codigo: 'AM-9408', criadoEm: diasAtras(1, 16),
    cliente: { nome: 'Escola Municipal Prof. Elza Moraes', tipo: 'Órgão público', documento: 'CNPJ 46.634.044/0001-74', cidade: 'Salto de Pirapora', uf: 'SP', telefone: '15997890123' },
    destino: 'Rua das Acácias, 300 - Centro',
    fio: 'FIO_14', malha: 'MALHA_2', alturaM: 2, metragemM: 210, tratamentoId: 5, rolos: '21 rolos x 10m',
    frete: { tipo: 'ENTREGA', distanciaKm: 27, descricao: 'Entrega técnica própria • 27 km' },
    valorMaterial: 13600, valorFrete: 900,
    observacao: 'Empenho nº 2026/0412 anexado',
    status: 'A_FAZER', aprovadoEm: minutosAtras(40), previsaoEntrega: diasAFrente(8),
  },
  {
    id: 9401, codigo: 'AM-9401', criadoEm: diasAtras(4),
    cliente: { nome: 'Haras Bela Vista', tipo: 'Produtor rural (PJ)', documento: 'CNPJ 21.334.876/0001-55', cidade: 'Araçoiaba da Serra', uf: 'SP', telefone: '15998901234' },
    destino: 'Estrada do Ipanema, Km 4',
    fio: 'FIO_12', malha: 'MALHA_3', alturaM: 1.8, metragemM: 640, tratamentoId: 5, rolos: '64 rolos x 10m',
    frete: { tipo: 'ENTREGA', distanciaKm: 31, descricao: 'Entrega técnica própria • 31 km' },
    valorMaterial: 26700, valorFrete: 1800,
    observacao: 'Boleto 30/60 dias',
    status: 'EM_PROCESSO', aprovadoEm: diasAtras(3), producaoIniciadaEm: diasAtras(2), previsaoEntrega: diasAFrente(2),
  },
  {
    id: 9402, codigo: 'AM-9402', criadoEm: diasAtras(5),
    cliente: { nome: 'Transportadora Rota Sul', tipo: 'Pessoa jurídica', documento: 'CNPJ 09.876.543/0001-21', cidade: 'Itapetininga', uf: 'SP', telefone: '15999012345' },
    destino: 'Pátio de manobras - Rod. SP-270 Km 168',
    fio: 'FIO_12', malha: 'MALHA_2', alturaM: 2.5, metragemM: 380, tratamentoId: 5, rolos: '38 rolos x 10m',
    frete: { tipo: 'ENTREGA', distanciaKm: 66, descricao: 'Entrega técnica própria • 66 km' },
    valorMaterial: 34200, valorFrete: 3900,
    observacao: 'Faturado 28 DDL',
    status: 'EM_PROCESSO', aprovadoEm: diasAtras(4), producaoIniciadaEm: diasAtras(1), previsaoEntrega: diasAFrente(1),
  },
  {
    id: 9399, codigo: 'AM-9399', criadoEm: diasAtras(9),
    cliente: { nome: 'Chácara Recanto Feliz', tipo: 'Pessoa física', documento: 'CPF 318.442.108-30', cidade: 'Piedade', uf: 'SP', telefone: '15990123456' },
    destino: 'Bairro Ribeirão dos Pires',
    fio: 'FIO_14', malha: 'MALHA_3', alturaM: 1.5, metragemM: 90, tratamentoId: 6, rolos: '9 rolos x 10m',
    frete: { tipo: 'RETIRADA', descricao: 'Retirada na fábrica (FOB - veículo próprio)' },
    valorMaterial: 3850, valorFrete: 0,
    observacao: 'Pix à vista',
    status: 'EM_PROCESSO', aprovadoEm: diasAtras(8), producaoIniciadaEm: diasAtras(6), previsaoEntrega: diasAFrente(-1),
  },
  {
    id: 9395, codigo: 'AM-9395', criadoEm: diasAtras(12),
    cliente: { nome: 'Indústria Metalforte', tipo: 'Pessoa jurídica', documento: 'CNPJ 12.555.987/0001-40', cidade: 'Votorantim', uf: 'SP', telefone: '15991112233' },
    destino: 'Av. Gisele Constantino, 1850',
    fio: 'FIO_12', malha: 'MALHA_2', alturaM: 2.5, metragemM: 420, tratamentoId: 5, rolos: '42 rolos x 10m',
    frete: { tipo: 'ENTREGA', distanciaKm: 14, descricao: 'Entrega técnica própria • 14 km' },
    valorMaterial: 37800, valorFrete: 1100,
    observacao: 'Faturado 28 DDL',
    status: 'ENTREGUE', aprovadoEm: diasAtras(11), producaoIniciadaEm: diasAtras(9), entregueEm: diasAtras(3), previsaoEntrega: isoDia(new Date(Date.now() - 3 * 864e5)),
  },
  {
    id: 9390, codigo: 'AM-9390', criadoEm: diasAtras(15),
    cliente: { nome: 'Condomínio Villa Toscana', tipo: 'Condomínio fechado', documento: 'CNPJ 30.221.654/0001-12', cidade: 'Sorocaba', uf: 'SP', telefone: '15992223344' },
    destino: 'Rua Toscana, 50 - Portaria',
    fio: 'FIO_14', malha: 'MALHA_2', alturaM: 2, metragemM: 260, tratamentoId: 6, rolos: '26 rolos x 10m',
    frete: { tipo: 'ENTREGA', distanciaKm: 11, descricao: 'Entrega técnica própria • 11 km' },
    valorMaterial: 15600, valorFrete: 700,
    observacao: 'Boleto à vista',
    status: 'ENTREGUE', aprovadoEm: diasAtras(14), producaoIniciadaEm: diasAtras(12), entregueEm: diasAtras(6), previsaoEntrega: isoDia(new Date(Date.now() - 6 * 864e5)),
  },
];

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
