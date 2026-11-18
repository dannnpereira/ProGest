import { Component, DestroyRef, WritableSignal, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Icone } from '../../shared/icone';
import { PedidosService, PreviaTecnica, aberturaMm, diametroMm } from '../../core/pedidos.service';
import { AvisosService } from '../../core/avisos.service';
import { Fio, Malha, Pedido } from '../../core/modelos';
import { data, doisDigitos, haQuanto, hora, mesmoDia, moeda, num } from '../../core/formato';

type Visao = 'cartoes' | 'tabela';
type TipoFrete = 'ENTREGA' | 'RETIRADA';

@Component({
  selector: 'app-aprovacao',
  imports: [Icone],
  templateUrl: './aprovacao.html',
  styleUrl: './aprovacao.css',
  host: { '(document:keydown.escape)': 'detalhe.set(null)' },
})
export class Aprovacao {
  protected svc = inject(PedidosService);
  private avisos = inject(AvisosService);

  /** ?q= vindo da busca do topo */
  q = input<string>();

  protected readonly moeda = moeda;
  protected readonly num = num;
  protected readonly doisDigitos = doisDigitos;

  protected visao = signal<Visao>('cartoes');
  protected texto = linkedSignal(() => this.q() ?? '');
  protected fio = signal<Fio | null>(null);
  protected malha = signal<Malha | null>(null);
  protected frete = signal<TipoFrete | null>(null);

  protected recusando = signal<number | null>(null);
  protected motivo = signal('');
  protected confirmandoLote = signal(false);
  protected detalhe = signal<Pedido | null>(null);

  /** Relógio para atualizar o "há 28 min" */
  protected agora = signal(Date.now());

  // ---------- Indicadores ----------
  protected fila = this.svc.fila;
  protected valorFila = computed(() => this.fila().reduce((s, p) => s + this.svc.total(p), 0));
  protected ticketMedio = computed(() => (this.fila().length ? this.valorFila() / this.fila().length : 0));
  protected novosHoje = computed(() => this.svc.pedidos().filter(p => mesmoDia(p.criadoEm, new Date(this.agora()))).length);
  protected novosOntem = computed(() => {
    const ontem = new Date(this.agora());
    ontem.setDate(ontem.getDate() - 1);
    return this.svc.pedidos().filter(p => mesmoDia(p.criadoEm, ontem)).length;
  });
  protected aprovadosHoje = computed(() =>
    this.svc.pedidos().filter(p => p.aprovadoEm && mesmoDia(p.aprovadoEm, new Date(this.agora()))),
  );
  protected valorAprovadosHoje = computed(() => this.aprovadosHoje().reduce((s, p) => s + this.svc.total(p), 0));

  // ---------- Filtros ----------
  protected contagem = computed(() => {
    const f = this.fila();
    const n = (fn: (p: Pedido) => boolean) => f.filter(fn).length;
    return {
      ENTREGA: n(p => p.frete.tipo === 'ENTREGA'), RETIRADA: n(p => p.frete.tipo === 'RETIRADA'),
    };
  });

  /** Chips de arame e malha: os produtos que aparecem nos pedidos da fila */
  protected opcoesFio = computed(() => opcoes(this.fila(), p => p.fio, p => p.fioNome));
  protected opcoesMalha = computed(() => opcoes(this.fila(), p => p.malha, p => p.malhaNome));

  protected filtrados = computed(() => {
    const termo = normalizar(this.texto());
    return this.fila().filter(p =>
      (!this.fio() || p.fio === this.fio()) &&
      (!this.malha() || p.malha === this.malha()) &&
      (!this.frete() || p.frete.tipo === this.frete()) &&
      (!termo || normalizar([
        p.codigo, p.cliente.nome, p.cliente.cidade, p.cliente.documento, p.destino,
        p.fioNome, p.malhaNome, p.tratamentoNome,
      ].join(' ')).includes(termo)),
    );
  });

  protected semFiltro = computed(() => !this.fio() && !this.malha() && !this.frete() && !this.texto().trim());

  constructor() {
    const id = setInterval(() => this.agora.set(Date.now()), 30000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  limparFiltros(): void {
    this.fio.set(null);
    this.malha.set(null);
    this.frete.set(null);
    this.texto.set('');
  }

  alternar<T>(sinal: WritableSignal<T | null>, valor: T): void {
    sinal.set(sinal() === valor ? null : valor);
  }

  // ---------- Ações ----------
  aprovar(p: Pedido): void {
    const antes = this.svc.copia([p.id]);
    this.svc.aprovar([p.id]);
    if (this.detalhe()?.id === p.id) this.detalhe.set(null);
    this.avisos.mostrar({
      texto: `Pedido #${p.codigo} aprovado e enviado para a produção.`,
      acao: { rotulo: 'Desfazer', executar: () => this.svc.restaurar(antes) },
    });
  }

  aprovarLote(): void {
    const ids = this.filtrados().map(p => p.id);
    if (!ids.length) return;
    const antes = this.svc.copia(ids);
    this.svc.aprovar(ids);
    this.confirmandoLote.set(false);
    this.avisos.mostrar({
      texto: `${ids.length} pedido(s) aprovados e enviados para a produção.`,
      acao: { rotulo: 'Desfazer', executar: () => this.svc.restaurar(antes) },
    });
  }

  iniciarRecusa(p: Pedido): void {
    this.recusando.set(p.id);
    this.motivo.set('');
  }

  confirmarRecusa(p: Pedido): void {
    const antes = this.svc.copia([p.id]);
    this.svc.recusar(p.id, this.motivo());
    this.recusando.set(null);
    if (this.detalhe()?.id === p.id) this.detalhe.set(null);
    this.avisos.mostrar({
      texto: `Pedido #${p.codigo} recusado.`,
      acao: { rotulo: 'Desfazer', executar: () => this.svc.restaurar(antes) },
    });
  }

  // ---------- Apoio ao template ----------
  total(p: Pedido): number {
    return this.svc.total(p);
  }

  /** Desenho da malha: losango proporcional à abertura e traço à espessura do arame */
  ladoLosango(p: Pedido): number {
    return Math.min(32, Math.max(10, aberturaMm(p) / 3));
  }

  espessuraTraco(p: Pedido): number {
    return Math.min(2.2, Math.max(0.8, diametroMm(p) * 0.6));
  }

  quando(p: Pedido): string {
    const prefixo = mesmoDia(p.criadoEm, new Date(this.agora())) ? 'Hoje' : data(p.criadoEm.slice(0, 10)).slice(0, 5);
    return `${prefixo} às ${hora(p.criadoEm)}`;
  }

  ha(p: Pedido): string {
    return haQuanto(p.criadoEm, this.agora());
  }

  whatsapp(p: Pedido): string {
    const msg = `Olá! Aqui é da Amaral Alambrados, sobre o seu pedido #${p.codigo}.`;
    return `https://wa.me/55${p.cliente.telefone}?text=${encodeURIComponent(msg)}`;
  }

  previa(p: Pedido): PreviaTecnica {
    return this.svc.previa(p);
  }

  tempo(min: number): string {
    return `${doisDigitos(Math.floor(min / 60))}h ${doisDigitos(Math.round(min % 60))}m`;
  }

  baixarMemorial(p: Pedido): void {
    const pr = this.previa(p);
    const linhas = [
      `MEMORIAL DESCRITIVO - PEDIDO #${p.codigo}`,
      `Amaral Alambrados • Planta Sorocaba`,
      '',
      `Cliente: ${p.cliente.nome} (${p.cliente.documento})`,
      `Local: ${p.destino} - ${p.cliente.cidade}/${p.cliente.uf}`,
      '',
      'ESPECIFICAÇÃO DA TELA',
      `Arame: ${p.fioNome}`,
      `Malha: ${p.malhaNome} losangular`,
      `Tratamento: ${p.tratamentoNome}`,
      `Altura: ${num(p.alturaM, 2)} m • Metragem: ${num(p.metragemM)} m lineares (${num(pr.areaM2)} m²)`,
      `Apresentação: ${p.rolos}`,
      '',
      'PCP (estimativas)',
      `Consumo de aço: ${num(pr.acoKg)} kg (${pr.bobinas} bobinas)`,
      `Tempo em tear: ${this.tempo(pr.tempoTearMin)}`,
      `Logística: ${p.frete.descricao} • Veículo: ${pr.veiculo}`,
      '',
      `Material: ${moeda(p.valorMaterial)} • Frete: ${moeda(p.valorFrete)} • Total: ${moeda(this.total(p))}`,
    ];
    const blob = new Blob([linhas.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memorial-${p.codigo}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Produtos distintos de uma lista de pedidos, com quantos pedidos usam cada um. */
function opcoes(lista: Pedido[], chave: (p: Pedido) => string, nome: (p: Pedido) => string) {
  const mapa = new Map<string, { chave: string; nome: string; n: number }>();
  for (const p of lista) {
    const k = chave(p);
    const item = mapa.get(k) ?? { chave: k, nome: nome(p), n: 0 };
    item.n++;
    mapa.set(k, item);
  }
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
}
