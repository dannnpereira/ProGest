import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Pedido, StatusPedido } from './pedido';
import { ContaService, PedidoApi } from './conta.service';

// Situação do backend -> situação mostrada ao cliente
const STATUS: Record<PedidoApi['status'], StatusPedido> = {
  AGUARDANDO_APROVACAO: 'aguardando_aprovacao',
  RECUSADO: 'recusado',
  A_FAZER: 'aguardando_producao',
  EM_PROCESSO: 'em_producao',
  ENTREGUE: 'finalizado',
};

/**
 * Pedidos do cliente logado, vindos de GET /api/conta/pedidos.
 * O backend devolve só os pedidos do dono do token.
 */
@Injectable({ providedIn: 'root' })
export class RastreioService {
  private conta = inject(ContaService);

  listarMeusPedidos(): Observable<Pedido[]> {
    return this.conta.meusPedidos().pipe(map(lista => lista.map(paraTela)));
  }
}

function paraTela(p: PedidoApi): Pedido {
  const aprovado = p.aprovadoEm ?? undefined;
  return {
    id: p.id,
    codigo: p.codigo,
    criadoEm: p.criadoEm,
    status: STATUS[p.status],
    bitola: p.arame === 'FIO_12' ? 'fio12' : 'fio14',
    malha: p.malha === 'MALHA_2' ? 'malha2' : 'malha3',
    tratamento: p.tratamento === 'PVC' ? 'pvc' : 'galvanizado',
    alturaMetros: Number(p.alturaM),
    comprimentoMetros: Number(p.comprimentoM),
    tipoFrete: p.entrega ? 'entrega' : 'retirada',
    enderecoEntrega: p.endereco ?? undefined,
    valorTotal: Number(p.valorTotal),
    // As condições de pagamento são combinadas na aprovação do pedido
    pagamentoConfirmado: !!p.aprovadoEm,
    motivoRecusa: p.motivoRecusa ?? undefined,
    datas: {
      aprovacao: aprovado,
      pagamento: aprovado,
      producao: p.producaoIniciadaEm ?? undefined,
      expedicao: p.entregueEm ?? undefined,
      finalizado: p.entregueEm ?? undefined,
    },
  };
}
