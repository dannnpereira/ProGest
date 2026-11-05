import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Pedido } from './pedido';

// Dados de mentira para construir a tela antes de existir a API.
const PEDIDOS_MOCK: Pedido[] = [
  {
    id: 1,
    codigo: 'AM-7820',
    criadoEm: '2026-10-28T09:15:00',
    status: 'em_producao',
    bitola: 'fio12',
    malha: 'malha3',
    tratamento: 'galvanizado',
    alturaMetros: 2,
    comprimentoMetros: 180,
    tipoFrete: 'entrega',
    enderecoEntrega: 'Av. Itavuvu, 1200 - Sorocaba/SP',
    valorTotal: 7204.5,
    pagamentoConfirmado: true,
    datas: {
      aprovacao: '2026-10-29T09:15:00',
      pagamento: '2026-10-30T14:30:00'
    }
  },
  {
    id: 2,
    codigo: 'AM-7941',
    criadoEm: '2026-11-03T16:40:00',
    status: 'aguardando_aprovacao',
    bitola: 'fio12',
    malha: 'malha2',
    tratamento: 'galvanizado',
    alturaMetros: 2.5,
    comprimentoMetros: 120,
    tipoFrete: 'retirada',
    valorTotal: 5529,
    pagamentoConfirmado: false,
    datas: {}
  },
  {
    id: 3,
    codigo: 'AM-7410',
    criadoEm: '2026-09-12T11:20:00',
    status: 'finalizado',
    bitola: 'fio14',
    malha: 'malha3',
    tratamento: 'pvc',
    alturaMetros: 1.5,
    comprimentoMetros: 60,
    tipoFrete: 'entrega',
    enderecoEntrega: 'Estrada do Votorantim, km 4 - Votorantim/SP',
    valorTotal: 1888.5,
    pagamentoConfirmado: true,
    datas: {
      aprovacao: '2026-09-12T15:00:00',
      pagamento: '2026-09-13T10:05:00',
      producao: '2026-09-17T17:30:00',
      expedicao: '2026-09-19T08:00:00',
      finalizado: '2026-09-19T14:10:00'
    }
  },
  {
    id: 4,
    codigo: 'AM-6992',
    criadoEm: '2026-08-04T10:00:00',
    status: 'finalizado',
    bitola: 'fio12',
    malha: 'malha3',
    tratamento: 'galvanizado',
    alturaMetros: 2,
    comprimentoMetros: 50,
    tipoFrete: 'retirada',
    valorTotal: 1876.25,
    pagamentoConfirmado: true,
    datas: {
      aprovacao: '2026-08-04T13:30:00',
      pagamento: '2026-08-05T09:45:00',
      producao: '2026-08-08T16:00:00',
      expedicao: '2026-08-09T08:30:00',
      finalizado: '2026-08-09T11:20:00'
    }
  },
  {
    id: 5,
    codigo: 'AM-6803',
    criadoEm: '2026-07-15T14:05:00',
    status: 'recusado',
    bitola: 'fio12',
    malha: 'malha2',
    tratamento: 'pvc',
    alturaMetros: 6,
    comprimentoMetros: 500,
    tipoFrete: 'entrega',
    enderecoEntrega: 'Rod. Raposo Tavares, km 98 - Sorocaba/SP',
    valorTotal: 61200,
    pagamentoConfirmado: false,
    motivoRecusa: 'A metragem pedida passa do prazo de produção informado. Fale com a fábrica para dividir o pedido em lotes.',
    datas: {}
  }
];

@Injectable({ providedIn: 'root' })
export class RastreioService {
  // Quando a API existir, troque o corpo por algo como:
  //   return this.http.get<Pedido[]>('/api/pedidos/meus');
  // O backend deve devolver só os pedidos do usuário logado (pelo token),
  // nunca confiar em um id enviado pelo front.
  listarMeusPedidos(): Observable<Pedido[]> {
    return of(PEDIDOS_MOCK).pipe(delay(400));
  }
}