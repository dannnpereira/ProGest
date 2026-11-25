import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { FormaPagamento, Pedido, StatusPedido } from './modelos';
import { SessaoService } from './sessao.service';
import { AvisosService } from './avisos.service';

// Transições permitidas na produção, iguais às do backend:
// não dá para pular etapa (ex.: de "A fazer" direto para "Entregue").
const PROXIMO: Partial<Record<StatusPedido, StatusPedido>> = {
  A_FAZER: 'EM_PROCESSO',
  EM_PROCESSO: 'ENTREGUE',
};

/**
 * Diâmetro do arame e abertura da malha (mm), usados nas estimativas técnicas.
 * Vêm do nome do produto, como "Fio 12 (2,77 mm)" ou "Malha 2" (50 mm)";
 * sem a medida no nome, usa um valor médio.
 */
const DIAMETRO_PADRAO_MM = 2.5;
const ABERTURA_PADRAO_MM = 60;

export function medidaMm(nome: string, padrao: number): number {
  const m = /(\d+(?:[.,]\d+)?)\s*mm/i.exec(nome ?? '');
  const v = m ? parseFloat(m[1].replace(',', '.')) : NaN;
  return v > 0 ? v : padrao;
}

export const diametroMm = (p: Pedido) => medidaMm(p.fioNome, DIAMETRO_PADRAO_MM);
export const aberturaMm = (p: Pedido) => medidaMm(p.malhaNome, ABERTURA_PADRAO_MM);
const VELOCIDADE_TEAR_M_MIN = 1.8;
/** Busca pedidos novos do site a cada minuto */
const ATUALIZAR_A_CADA_MS = 60_000;

export interface PreviaTecnica {
  areaM2: number;
  acoKg: number;
  bobinas: number;
  tempoTearMin: number;
  veiculo: string;
  saida: string;
}

/**
 * Pedidos feitos pelo site (API). O administrador vê todos (/api/erp/pedidos);
 * o funcionário só os da produção (/api/erp/producao/pedidos).
 * As ações mudam a tela na hora e, se o servidor recusar, a lista é recarregada.
 */
@Injectable({ providedIn: 'root' })
export class PedidosService {
  private http = inject(HttpClient);
  private sessao = inject(SessaoService);
  private avisos = inject(AvisosService);

  readonly pedidos = signal<Pedido[]>([]);
  readonly estado = signal<'carregando' | 'ok' | 'erro'>('carregando');

  readonly fila = computed(() =>
    this.pedidos()
      .filter(p => p.status === 'AGUARDANDO_APROVACAO')
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
  );

  // A primeira carga é feita pelo Layout ao abrir o painel (depois do login,
  // para buscar a lista certa para o perfil de quem entrou).
  constructor() {
    if (typeof window !== 'undefined') {
      setInterval(() => {
        if (this.sessao.logado()) this.carregar(true);
      }, ATUALIZAR_A_CADA_MS);
    }
  }

  async carregar(silencioso = false): Promise<void> {
    if (!this.sessao.logado()) return;
    if (!silencioso) this.estado.set('carregando');
    const url = this.sessao.ehAdmin() ? '/api/erp/pedidos' : '/api/erp/producao/pedidos';
    try {
      const lista = await firstValueFrom(this.http.get<Pedido[]>(url));
      this.pedidos.set(lista.map(normalizar));
      this.estado.set('ok');
    } catch {
      if (!silencioso) this.estado.set('erro');
    }
  }

  total(p: Pedido): number {
    return p.valorMaterial + p.valorFrete;
  }

  porStatus(status: StatusPedido): Pedido[] {
    return this.pedidos().filter(p => p.status === status);
  }

  aprovar(ids: number[]): void {
    const agora = new Date().toISOString();
    this.atualizarLocal(ids, p => (p.status === 'AGUARDANDO_APROVACAO' ? { ...p, status: 'A_FAZER', aprovadoEm: agora } : p));
    this.enviar(this.http.post<Pedido[]>('/api/erp/pedidos/aprovar', { ids }), 'aprovar');
  }

  recusar(id: number, motivo: string): void {
    this.atualizarLocal([id], p => ({
      ...p, status: 'RECUSADO', recusadoEm: new Date().toISOString(), motivoRecusa: motivo.trim() || undefined,
    }));
    this.enviar(this.http.post<Pedido>(`/api/erp/pedidos/${id}/recusar`, { motivo }), 'recusar');
  }

  /** Avança uma etapa da produção. Retorna false se a transição não for permitida. */
  avancar(id: number): boolean {
    const p = this.pedidos().find(x => x.id === id);
    const proximo = p && PROXIMO[p.status];
    if (!p || !proximo) return false;
    const agora = new Date().toISOString();
    this.atualizarLocal([id], x => ({
      ...x,
      status: proximo,
      ...(proximo === 'EM_PROCESSO' ? { producaoIniciadaEm: agora } : {}),
      ...(proximo === 'ENTREGUE' ? { entregueEm: agora } : {}),
    }));
    this.enviar(this.http.post<Pedido>(`/api/erp/producao/pedidos/${id}/avancar`, {}), 'atualizar a produção');
    return true;
  }

  /** "Desfazer" dos avisos: volta cada pedido para como estava. */
  restaurar(anteriores: Pedido[]): void {
    for (const antes of anteriores) {
      const agora = this.pedidos().find(p => p.id === antes.id);
      if (!agora || agora.status === antes.status) continue;
      const url = antes.status === 'AGUARDANDO_APROVACAO'
        ? `/api/erp/pedidos/${antes.id}/voltar-para-fila`
        : `/api/erp/producao/pedidos/${antes.id}/voltar`;
      this.atualizarLocal([antes.id], () => ({ ...antes }));
      this.enviar(this.http.post<Pedido>(url, {}), 'desfazer');
    }
  }

  // ---------- Contas a receber (Financeiro) ----------

  /** O cliente pagou: a conta sai de "a receber" e o valor vai para as entradas. */
  registrarPagamento(id: number, data: string, forma: FormaPagamento): void {
    this.atualizarLocal([id], p => ({ ...p, pagoEm: data, formaPagamento: forma }));
    this.enviar(this.http.post<Pedido>(`/api/erp/pedidos/${id}/pagamento`, { data, forma }), 'registrar o pagamento');
  }

  /** Estorno: a conta volta para pendente (ou vencida). */
  estornarPagamento(id: number): void {
    this.atualizarLocal([id], p => ({ ...p, pagoEm: undefined, formaPagamento: undefined }));
    this.enviar(this.http.delete<Pedido>(`/api/erp/pedidos/${id}/pagamento`), 'estornar o pagamento');
  }

  copia(ids: number[]): Pedido[] {
    return this.pedidos().filter(p => ids.includes(p.id)).map(p => ({ ...p }));
  }

  previa(p: Pedido): PreviaTecnica {
    const areaM2 = p.metragemM * p.alturaM;
    // Comprimento de arame por m² de tela losangular ≈ 2 fios / abertura, com ~10% de dobra
    const metrosArame = areaM2 * (2 / (aberturaMm(p) / 1000)) * 1.1;
    const raio = diametroMm(p) / 2000;
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

  private atualizarLocal(ids: number[], fn: (p: Pedido) => Pedido): void {
    this.pedidos.update(lista => lista.map(p => (ids.includes(p.id) ? fn(p) : p)));
  }

  /** Manda a ação ao servidor; a resposta (ou um erro) atualiza a lista com os dados oficiais. */
  private async enviar(req: Observable<unknown>, acao: string): Promise<void> {
    try {
      const resp = (await firstValueFrom(req)) as Pedido | Pedido[];
      const atualizados = (Array.isArray(resp) ? resp : [resp]).map(normalizar);
      const mapa = new Map(atualizados.map(p => [p.id, p]));
      this.pedidos.update(lista => lista.map(p => mapa.get(p.id) ?? p));
    } catch (e) {
      const msg = (e as { error?: { message?: string } })?.error?.message;
      this.avisos.mostrar({ texto: `Não foi possível ${acao}. ${msg ?? 'Tente de novo.'}` });
      this.carregar(true);
    }
  }
}

// O Java manda os valores decimais como número/texto; garante number
function normalizar(p: Pedido): Pedido {
  return {
    ...p,
    alturaM: Number(p.alturaM),
    metragemM: Number(p.metragemM),
    valorMaterial: Number(p.valorMaterial),
    valorFrete: Number(p.valorFrete),
    aprovadoEm: p.aprovadoEm ?? undefined,
    recusadoEm: p.recusadoEm ?? undefined,
    motivoRecusa: p.motivoRecusa ?? undefined,
    producaoIniciadaEm: p.producaoIniciadaEm ?? undefined,
    entregueEm: p.entregueEm ?? undefined,
    previsaoEntrega: p.previsaoEntrega ?? undefined,
    pagoEm: p.pagoEm ?? undefined,
    formaPagamento: p.formaPagamento ?? undefined,
  };
}
