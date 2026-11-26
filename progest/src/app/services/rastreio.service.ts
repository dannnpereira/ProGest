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
    arame: p.arameNome,
    malha: p.malhaNome,
    tratamento: p.tratamentoNome,
    alturaMetros: Number(p.alturaM),
    comprimentoMetros: Number(p.comprimentoM),
    tipoFrete: p.entrega ? 'entrega' : 'retirada',
    enderecoEntrega: p.endereco ?? undefined,
    valorTotal: Number(p.valorTotal),
    // A fábrica confirma o pagamento no Financeiro do ERP
    pagamentoConfirmado: !!p.pagoEm,
    motivoRecusa: p.motivoRecusa ?? undefined,
    valores: {
      materiaPrima: Number(p.valorMateriaPrima),
      acessorios: Number(p.valorAcessorios),
      frete: Number(p.valorFrete),
      distanciaKm: p.distanciaKm,
      descontoPct: Number(p.descontoPct),
      desconto: Number(p.valorDesconto),
      parcelas: p.parcelas,
      valorParcela: Number(p.valorParcela),
    },
    datas: {
      aprovacao: aprovado,
      // Só a data (sem horário): meio-dia local para não mudar de dia com o fuso
      pagamento: p.pagoEm ? `${p.pagoEm}T12:00:00` : undefined,
      producao: p.producaoIniciadaEm ?? undefined,
      expedicao: p.entregueEm ?? undefined,
      finalizado: p.entregueEm ?? undefined,
    },
  };
}
