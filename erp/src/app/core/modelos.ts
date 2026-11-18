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

export interface Compra {
  id: number;
  data: string; // yyyy-mm-dd
  fornecedor: string;
  material: string;
  quantidade: string;
  valor: number;
  status: StatusCompra;
}

export interface Movimentacao {
  id: number;
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
