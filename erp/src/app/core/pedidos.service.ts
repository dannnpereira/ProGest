import { Injectable, computed, effect, signal } from '@angular/core';
import { Pedido, StatusPedido } from './modelos';
import { PEDIDOS_EXEMPLO } from './dados-exemplo';
import { ler, gravar } from './armazenamento';
import { isoDia } from './formato';

// Transições permitidas, iguais à validação do WorkflowService no backend:
// não dá para pular etapa (ex.: de "A fazer" direto para "Entregue").
const PROXIMO: Partial<Record<StatusPedido, StatusPedido>> = {
  A_FAZER: 'EM_PROCESSO',
  EM_PROCESSO: 'ENTREGUE',
};

/** Diâmetro do arame em mm e abertura da malha em mm, usados nas estimativas técnicas. */
const DIAMETRO_MM = { FIO_12: 2.77, FIO_14: 2.1 } as const;
const ABERTURA_MM = { MALHA_2: 50, MALHA_3: 75 } as const;
const VELOCIDADE_TEAR_M_MIN = 1.8;

export interface PreviaTecnica {
  areaM2: number;
  acoKg: number;
  bobinas: number;
  tempoTearMin: number;
  veiculo: string;
  saida: string;
}

@Injectable({ providedIn: 'root' })
export class PedidosService {
  readonly pedidos = signal<Pedido[]>(ler('pedidos', PEDIDOS_EXEMPLO));

  readonly fila = computed(() =>
    this.pedidos()
      .filter(p => p.status === 'AGUARDANDO_APROVACAO')
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
  );

  constructor() {
    effect(() => gravar('pedidos', this.pedidos()));
  }

  total(p: Pedido): number {
    return p.valorMaterial + p.valorFrete;
  }

  porStatus(status: StatusPedido): Pedido[] {
    return this.pedidos().filter(p => p.status === status);
  }

  aprovar(ids: number[]): void {
    const agora = new Date().toISOString();
    const prazo = new Date();
    prazo.setDate(prazo.getDate() + 7);
    this.atualizar(ids, p =>
      p.status === 'AGUARDANDO_APROVACAO'
        ? { ...p, status: 'A_FAZER', aprovadoEm: agora, previsaoEntrega: p.previsaoEntrega ?? isoDia(prazo) }
        : p,
    );
  }

  recusar(id: number, motivo: string): void {
    this.atualizar([id], p => ({
      ...p, status: 'RECUSADO', recusadoEm: new Date().toISOString(), motivoRecusa: motivo.trim() || undefined,
    }));
  }

  /** Avança uma etapa da produção. Retorna false se a transição não for permitida. */
  avancar(id: number): boolean {
    const p = this.pedidos().find(x => x.id === id);
    const proximo = p && PROXIMO[p.status];
    if (!p || !proximo) return false;
    const agora = new Date().toISOString();
    this.atualizar([id], x => ({
      ...x,
      status: proximo,
      ...(proximo === 'EM_PROCESSO' ? { producaoIniciadaEm: agora } : {}),
      ...(proximo === 'ENTREGUE' ? { entregueEm: agora } : {}),
    }));
    return true;
  }

  /** Volta ao estado anterior (usado pelo "Desfazer" dos avisos). */
  restaurar(anteriores: Pedido[]): void {
    const mapa = new Map(anteriores.map(p => [p.id, p]));
    this.pedidos.update(lista => lista.map(p => mapa.get(p.id) ?? p));
  }

  copia(ids: number[]): Pedido[] {
    return this.pedidos().filter(p => ids.includes(p.id)).map(p => ({ ...p }));
  }

  previa(p: Pedido): PreviaTecnica {
    const areaM2 = p.metragemM * p.alturaM;
    // Comprimento de arame por m² de tela losangular ≈ 2 fios / abertura, com ~10% de dobra
    const metrosArame = areaM2 * (2 / (ABERTURA_MM[p.malha] / 1000)) * 1.1;
    const raio = DIAMETRO_MM[p.fio] / 2000;
    const acoKg = metrosArame * Math.PI * raio * raio * 7850;
    const pesoT = acoKg / 1000;
    const veiculo = p.frete.tipo === 'RETIRADA'
      ? 'Retirada pelo cliente'
      : pesoT <= 3 ? 'Toco (cap. 6 t)' : pesoT <= 10 ? 'Truck 3 eixos (cap. 14 t)' : 'Carreta (cap. 27 t)';
    return {
      areaM2,
      acoKg,
      bobinas: Math.ceil(acoKg / 400),
      tempoTearMin: p.metragemM / VELOCIDADE_TEAR_M_MIN,
      veiculo,
      saida: p.previsaoEntrega ?? '',
    };
  }

  private atualizar(ids: number[], fn: (p: Pedido) => Pedido): void {
    this.pedidos.update(lista => lista.map(p => (ids.includes(p.id) ? fn(p) : p)));
  }
}
