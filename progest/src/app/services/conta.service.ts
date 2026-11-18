import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Dados do cadastro (CPF vem mascarado do servidor: 529.***.***-25) */
export interface Perfil {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
}

/** Pedido como o backend devolve em /api/conta/pedidos */
export interface PedidoApi {
  id: number;
  codigo: string;
  criadoEm: string;
  status: 'AGUARDANDO_APROVACAO' | 'RECUSADO' | 'A_FAZER' | 'EM_PROCESSO' | 'ENTREGUE';
  /** Chaves dos produtos escolhidos */
  arame: string;
  malha: string;
  tratamento: string;
  /** Nomes dos produtos no momento do pedido */
  arameNome: string;
  malhaNome: string;
  tratamentoNome: string;
  alturaM: number;
  comprimentoM: number;
  entrega: boolean;
  endereco: string | null;
  distanciaKm: number | null;
  valorMateriaPrima: number;
  valorAcessorios: number;
  valorFrete: number;
  descontoPct: number;
  valorDesconto: number;
  valorTotal: number;
  parcelas: number;
  valorParcela: number;
  motivoRecusa: string | null;
  aprovadoEm: string | null;
  producaoIniciadaEm: string | null;
  entregueEm: string | null;
  previsaoEntrega: string | null;
}

export interface NovoPedido {
  arame: string;
  malha: string;
  tratamento: string;
  alturaM: number;
  comprimentoM: number;
  entrega: boolean;
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
  } | null;
}

/** Área do cliente logado: perfil e pedidos (o token vai pelo auth.interceptor). */
@Injectable({ providedIn: 'root' })
export class ContaService {
  private http = inject(HttpClient);

  perfil(): Observable<Perfil> {
    return this.http.get<Perfil>('/api/conta');
  }

  meusPedidos(): Observable<PedidoApi[]> {
    return this.http.get<PedidoApi[]>('/api/conta/pedidos');
  }

  fazerPedido(pedido: NovoPedido): Observable<PedidoApi> {
    return this.http.post<PedidoApi>('/api/conta/pedidos', pedido);
  }
}
