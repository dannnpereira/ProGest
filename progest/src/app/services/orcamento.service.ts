import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Escolhas do configurador. Os produtos vão pela chave cadastrada no ERP.
export interface PedidoOrcamento {
  arame: 'FIO_12' | 'FIO_14';
  malha: 'MALHA_2' | 'MALHA_3';
  tratamento: 'GALVANIZADA' | 'PVC';
  alturaM: number;
  comprimentoM: number;
  entrega: boolean;
  cep: string | null;
}

export interface Orcamento {
  areaM2: number;
  materiaPrima: number;
  acessorios: number;
  frete: { valor: number; distanciaKm: number | null; combustivel: number | null; pedagios: number | null };
  descontoPct: number;
  desconto: number;
  total: number;
  parcelas: number;
  valorParcela: number;
}

/**
 * O orçamento é calculado no backend (POST /api/orcamento) com os preços e regras
 * que o ERP grava no banco. O site não tem nenhum preço no código.
 */
@Injectable({ providedIn: 'root' })
export class OrcamentoService {
  private http = inject(HttpClient);

  calcular(pedido: PedidoOrcamento): Observable<Orcamento> {
    return this.http.post<Orcamento>('/api/orcamento', pedido);
  }
}
