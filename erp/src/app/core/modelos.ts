// Modelos usados pelas telas do ERP.
// Os status de produção seguem o enum StatusWorkflow do backend (A_FAZER, EM_PROCESSO, ENTREGUE).

export type StatusPedido =
  | 'AGUARDANDO_APROVACAO'
  | 'RECUSADO'
  | 'A_FAZER'
  | 'EM_PROCESSO'
  | 'ENTREGUE';

export type Fio = 'FIO_12' | 'FIO_14';
export type Malha = 'MALHA_2' | 'MALHA_3';

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
  tratamento: 'GALVANIZADA' | 'PVC'; // chave do produto da categoria Tratamento
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

export const ROTULO_FIO: Record<Fio, string> = {
  FIO_12: 'Fio 12 (2,77 mm)',
  FIO_14: 'Fio 14 (2,10 mm)',
};

export const ROTULO_MALHA: Record<Malha, string> = {
  MALHA_2: 'Malha 2" (50 mm)',
  MALHA_3: 'Malha 3" (75 mm)',
};

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
