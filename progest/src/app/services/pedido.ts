// Modelo do pedido para a tela de rastreio.
// Os status seguem o ciclo de funcionalidades do ProGest:
// aprovação do pedido -> pagamento -> aguardando produção -> em produção
// -> ag. entrega / ag. retirada -> finalizado.
// Este arquivo é o "contrato" que o backend deve devolver em JSON.

export type StatusPedido =
  | 'aguardando_aprovacao'
  | 'recusado'
  | 'aguardando_producao'
  | 'em_producao'
  | 'ag_entrega'
  | 'ag_retirada'
  | 'finalizado';

export type TipoFrete = 'entrega' | 'retirada';

// As cinco etapas que o cliente enxerga na linha do tempo
export type EtapaChave = 'aprovacao' | 'pagamento' | 'producao' | 'expedicao' | 'finalizado';

export interface Pedido {
  id: number;
  codigo: string;            // ex.: "AM-7820"
  criadoEm: string;          // data ISO
  status: StatusPedido;
  bitola: 'fio12' | 'fio14';
  malha: 'malha2' | 'malha3';
  tratamento: 'galvanizado' | 'pvc';
  alturaMetros: number;
  comprimentoMetros: number;
  tipoFrete: TipoFrete;
  enderecoEntrega?: string;  // só quando tipoFrete === 'entrega'
  valorTotal: number;
  pagamentoConfirmado: boolean;
  motivoRecusa?: string;     // só quando status === 'recusado'
  datas: Partial<Record<EtapaChave, string>>; // data em que cada etapa foi concluída
}

export type EstadoEtapa = 'concluida' | 'atual' | 'pendente' | 'recusada';

export interface Etapa {
  chave: EtapaChave;
  titulo: string;
  descricao: string;
  estado: EstadoEtapa;
  data?: string;
}