import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { PrecoTela, Produto, RegrasOrcamento } from './modelos';
import { PRODUTOS_EXEMPLO, REGRAS_EXEMPLO } from './dados-exemplo';
import { SessaoService } from './sessao.service';

/** Pedido de orçamento — o mesmo que o configurador do site envia. */
export interface PedidoOrcamento {
  arame: string;
  malha: string;
  tratamento: string;
  alturaM: number;
  comprimentoM: number;
  entrega: boolean;
  cep: string | null;
}

/** Orçamento calculado pela API (POST /api/orcamento). */
export interface Orcamento {
  areaM2: number;
  materiaPrima: number;
  acessorios: number;
  /** Na retirada, valor 0 e os demais campos nulos */
  frete: { valor: number; distanciaKm?: number | null; combustivel?: number | null; pedagios?: number | null };
  descontoPct: number;
  desconto: number;
  total: number;
  parcelas: number;
  valorParcela: number;
}

type DadosProduto = Omit<Produto, 'id' | 'chave'>;
export type DadosPreco = Omit<PrecoTela, 'id'>;

/**
 * Produtos e regras do orçamento, gravados no banco pela API.
 * São os mesmos valores que o configurador do site usa (GET /api/catalogo).
 */
@Injectable({ providedIn: 'root' })
export class ProdutosService {
  private http = inject(HttpClient);
  private sessao = inject(SessaoService);

  // Começa com os valores padrão para os nomes aparecerem na hora;
  // a lista do banco substitui assim que chega.
  readonly produtos = signal<Produto[]>(PRODUTOS_EXEMPLO());
  readonly regras = signal<RegrasOrcamento>(REGRAS_EXEMPLO());

  /** 'carregando' | 'ok' | 'erro' — só dá para editar com 'ok' */
  readonly estado = signal<'carregando' | 'ok' | 'erro'>('carregando');

  readonly ativos = computed(() => this.produtos().filter(p => p.ativo));

  /** Tabela de preços (tela por m² e arame por kg) */
  readonly precos = signal<PrecoTela[]>([]);

  /** Telas que viram opção no site: preço por m² com arame, malha e tratamento ativos */
  readonly telasNoSite = computed(() => {
    const ativos = new Set(this.ativos().map(p => p.chave));
    return this.precos().filter(t =>
      t.unidade === 'M2' && ativos.has(t.arame) && !!t.malha && ativos.has(t.malha) && ativos.has(t.tratamento));
  });

  constructor() {
    // Funcionário não tem acesso à tabela de preços (o servidor recusa):
    // a tela de Produção usa só os nomes padrão dos produtos.
    if (this.sessao.ehAdmin()) this.carregar();
  }

  async carregar(): Promise<void> {
    this.estado.set('carregando');
    try {
      const [produtos, regras, precos] = await Promise.all([
        firstValueFrom(this.http.get<Produto[]>('/api/erp/produtos')),
        firstValueFrom(this.http.get<RegrasOrcamento>('/api/erp/regras-orcamento')),
        firstValueFrom(this.http.get<PrecoTela[]>('/api/erp/precos')),
      ]);
      this.produtos.set(produtos.map(normalizar));
      this.precos.set(precos.map(normalizarPreco));
      this.regras.set({ descontoAVistaPct: Number(regras.descontoAVistaPct), parcelasMax: regras.parcelasMax });
      this.estado.set('ok');
    } catch {
      this.estado.set('erro');
    }
  }

  porId(id: number): Produto | undefined {
    return this.produtos().find(p => p.id === id);
  }

  async salvar(dados: DadosProduto & { id?: number }): Promise<Produto> {
    const corpo: DadosProduto = {
      categoria: dados.categoria, nome: dados.nome, descricao: dados.descricao,
      unidade: dados.unidade, valor: dados.valor, ativo: dados.ativo,
    };
    const salvo = normalizar(await firstValueFrom(
      dados.id
        ? this.http.put<Produto>(`/api/erp/produtos/${dados.id}`, corpo)
        : this.http.post<Produto>('/api/erp/produtos', corpo),
    ));
    this.produtos.update(lista =>
      lista.some(p => p.id === salvo.id) ? lista.map(p => (p.id === salvo.id ? salvo : p)) : [...lista, salvo],
    );
    return salvo;
  }

  /** Liga/desliga no simulador. Muda na tela na hora e desfaz se o servidor recusar. */
  async alternarAtivo(id: number): Promise<void> {
    const original = this.porId(id);
    if (!original) return;
    const alterado = { ...original, ativo: !original.ativo };
    this.produtos.update(lista => lista.map(p => (p.id === id ? alterado : p)));
    try {
      await this.salvar(alterado);
    } catch (e) {
      this.produtos.update(lista => lista.map(p => (p.id === id ? original : p)));
      throw e;
    }
  }

  /** Exclui o produto: some daqui e do site (os pedidos antigos continuam com o nome). */
  async excluir(id: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`/api/erp/produtos/${id}`));
    this.produtos.update(lista => lista.filter(p => p.id !== id));
  }

  // ---------- Tabela de preços ----------

  async salvarPreco(dados: DadosPreco & { id?: number }): Promise<PrecoTela> {
    const { id, ...corpo } = dados;
    const salvo = normalizarPreco(await firstValueFrom(
      id ? this.http.put<PrecoTela>(`/api/erp/precos/${id}`, corpo) : this.http.post<PrecoTela>('/api/erp/precos', corpo),
    ));
    this.precos.update(lista =>
      lista.some(p => p.id === salvo.id) ? lista.map(p => (p.id === salvo.id ? salvo : p)) : [...lista, salvo],
    );
    return salvo;
  }

  async excluirPreco(id: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`/api/erp/precos/${id}`));
    this.precos.update(lista => lista.filter(p => p.id !== id));
  }

  async salvarRegras(regras: RegrasOrcamento): Promise<void> {
    const salvo = await firstValueFrom(this.http.put<RegrasOrcamento>('/api/erp/regras-orcamento', regras));
    this.regras.set({ descontoAVistaPct: Number(salvo.descontoAVistaPct), parcelasMax: salvo.parcelasMax });
  }

  /**
   * Orçamento calculado pelo backend — a mesma rota que o site usa,
   * então a prévia do ERP e o site sempre dão o mesmo valor.
   */
  orcar(pedido: PedidoOrcamento): Observable<Orcamento> {
    return this.http.post<Orcamento>('/api/orcamento', pedido);
  }
}

// O Java manda o valor como número decimal; garante number e descrição em texto
function normalizar(p: Produto): Produto {
  return { ...p, valor: Number(p.valor), descricao: p.descricao ?? '', chave: p.chave ?? undefined };
}

function numOuNulo(v: unknown): number | null {
  return v === null || v === undefined || v === '' ? null : Number(v);
}

function normalizarPreco(p: PrecoTela): PrecoTela {
  return { ...p, valorVista: Number(p.valorVista), valorPrazo: numOuNulo(p.valorPrazo), pesoKgM2: numOuNulo(p.pesoKgM2) };
}
