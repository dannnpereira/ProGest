// Modelos usados pelas telas do ERP.
// Os status de produção seguem o enum StatusWorkflow do backend (A_FAZER, EM_PROCESSO, ENTREGUE).

export type StatusPedido =
  | 'AGUARDANDO_APROVACAO'
  | 'RECUSADO'
  | 'A_FAZER'
  | 'EM_PROCESSO'
  | 'ENTREGUE';

/** Chaves dos produtos cadastrados em "Produtos e Valores" (FIO_12, MALHA_3, PROD_8...) */
export type Fio = string;
export type Malha = string;

export interface Cliente {
  nome: string;
  tipo: string; // "Pessoa jurídica", "Produtor rural (PF)"...
  documento: string; // CPF ou CNPJ já formatado
  cidade: string;
  uf: string;
  telefone: string; // só dígitos, com DDD
  email?: string;
}

export interface Pedido {
  id: number;
  codigo: string; // AM-9410
  criadoEm: string; // ISO
  cliente: Cliente;
  destino: string;

  fio: Fio;
  malha: Malha;
  alturaM: number;
  metragemM: number;
  tratamento: string; // chave do produto da categoria Tratamento
  /** Nomes dos produtos gravados no pedido (não mudam se o produto for renomeado/excluído) */
  fioNome: string;
  malhaNome: string;
  tratamentoNome: string;
  rolos: string;

  frete: { tipo: 'ENTREGA' | 'RETIRADA'; distanciaKm?: number; descricao: string };
  valorMaterial: number;
  valorFrete: number;
  observacao: string;

  status: StatusPedido;
  aprovadoEm?: string;
  recusadoEm?: string;
  motivoRecusa?: string;
  producaoIniciadaEm?: string;
  entregueEm?: string;
  previsaoEntrega?: string; // yyyy-mm-dd
  /** Contas a receber: data em que o cliente pagou (vazio = em aberto) */
  pagoEm?: string; // yyyy-mm-dd
  formaPagamento?: FormaPagamento;
}

export type Categoria = 'ARAME' | 'MALHA' | 'TRATAMENTO' | 'ACESSORIOS';
export type Unidade = 'M2' | 'METRO_LINEAR' | 'UNIDADE';

export interface Produto {
  id: number;
  categoria: Categoria;
  nome: string;
  descricao: string;
  unidade: Unidade;
  valor: number;
  ativo: boolean;
  /** Chave técnica usada pelo configurador (ex.: FIO_12, MALHA_3) */
  chave?: string;
}

/** Como a linha da tabela de preços é cobrada: tela por m² ou arame avulso por kg */
export type UnidadePreco = 'M2' | 'KG';

/**
 * Linha da tabela de preços: arame + malha + tratamento (chaves dos produtos).
 * As telas (M2) são as combinações que o cliente pode escolher no site.
 */
export interface PrecoTela {
  id: number;
  arame: string;
  malha: string | null; // vazia no arame por kg
  tratamento: string;
  unidade: UnidadePreco;
  pesoKgM2: number | null;
  valorVista: number;
  valorPrazo: number | null;
}

export interface RegrasOrcamento {
  descontoAVistaPct: number;
  parcelasMax: number;
}

export type StatusCompra = 'PAGO' | 'A_PAGAR' | 'ATRASADO';

export type TipoLancamento = 'COMPRA' | 'DESPESA' | 'ENTRADA';

/** Lançamento do Financeiro como a API grava (tabela lancamentos_financeiros). */
export interface Lancamento {
  id: number;
  tipo: TipoLancamento;
  data: string; // yyyy-mm-dd
  categoria: CategoriaDespesa | null;
  /** Material (compra) ou descrição */
  descricao: string;
  /** Fornecedor (compra), favorecido (despesa) ou origem (entrada) */
  favorecido: string | null;
  quantidade: string | null;
  valor: number;
  status: StatusCompra;
}

/** Compra de material (lançamento do tipo COMPRA, no formato da tela). */
export interface Compra {
  id: number;
  data: string; // yyyy-mm-dd
  fornecedor: string;
  material: string;
  quantidade: string;
  valor: number;
  status: StatusCompra;
}

export type CategoriaDespesa =
  | 'SALARIOS' | 'ENCARGOS' | 'ALUGUEL' | 'ENERGIA' | 'AGUA'
  | 'IMPOSTOS' | 'VEICULOS' | 'FRETE' | 'OUTROS';

/** Saídas que não são compra de material (folha, contas fixas, impostos...). */
export interface Despesa {
  id: number;
  data: string; // yyyy-mm-dd
  categoria: CategoriaDespesa;
  descricao: string;
  favorecido: string;
  valor: number;
  status: StatusCompra;
}

export type FormaPagamento = 'PIX' | 'BOLETO' | 'TED' | 'CARTAO' | 'DINHEIRO';

export interface Recebimento {
  data: string; // yyyy-mm-dd
  forma: FormaPagamento;
}

export type StatusConta = 'PENDENTE' | 'VENCIDO' | 'PAGO';

/** Valor de um pedido aprovado a receber do cliente. */
export interface ContaReceber {
  pedidoId: number;
  codigo: string;
  cliente: string;
  valor: number;
  emissao: string; // yyyy-mm-dd (aprovação do pedido)
  vencimento: string; // yyyy-mm-dd
  status: StatusConta;
  /** Dias até o vencimento (negativo = dias em atraso) */
  dias: number;
  recebimento?: Recebimento;
}

export interface Movimentacao {
  id: string;
  data: string; // yyyy-mm-dd
  descricao: string;
  detalhe: string;
  tipo: 'ENTRADA' | 'SAIDA';
  valor: number;
}

export interface ResumoMes {
  mes: string; // yyyy-mm
  vendas: number;
  entradas: number;
  saidas: number;
}

export const ROTULO_CATEGORIA: Record<Categoria, string> = {
  ARAME: 'Arame',
  MALHA: 'Malha',
  TRATAMENTO: 'Tratamento',
  ACESSORIOS: 'Acessórios',
};

export const ROTULO_UNIDADE: Record<Unidade, string> = {
  M2: 'por m²',
  METRO_LINEAR: 'por metro linear',
  UNIDADE: 'por unidade',
};

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  RECUSADO: 'Recusado',
  A_FAZER: 'A fazer',
  EM_PROCESSO: 'Em produção',
  ENTREGUE: 'Entregue',
};

export const ROTULO_CATEGORIA_DESPESA: Record<CategoriaDespesa, string> = {
  SALARIOS: 'Salários',
  ENCARGOS: 'Encargos',
  ALUGUEL: 'Aluguel',
  ENERGIA: 'Energia',
  AGUA: 'Água',
  IMPOSTOS: 'Impostos',
  VEICULOS: 'Veículos',
  FRETE: 'Frete',
  OUTROS: 'Outros',
};

export const ROTULO_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  TED: 'Transferência TED',
  CARTAO: 'Cartão',
  DINHEIRO: 'Dinheiro',
};
