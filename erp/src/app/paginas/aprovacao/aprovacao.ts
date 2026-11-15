import { Component, DestroyRef, WritableSignal, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Icone } from '../../shared/icone';
import { PedidosService, PreviaTecnica } from '../../core/pedidos.service';
import { ProdutosService } from '../../core/produtos.service';
import { AvisosService } from '../../core/avisos.service';
import { Fio, Malha, Pedido, ROTULO_FIO, ROTULO_MALHA } from '../../core/modelos';
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
  private produtos = inject(ProdutosService);
  private avisos = inject(AvisosService);

  /** ?q= vindo da busca do topo */
  q = input<string>();

  protected readonly moeda = moeda;
  protected readonly num = num;
  protected readonly doisDigitos = doisDigitos;
  protected readonly rotuloFio = ROTULO_FIO;
  protected readonly rotuloMalha = ROTULO_MALHA;

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
      FIO_12: n(p => p.fio === 'FIO_12'), FIO_14: n(p => p.fio === 'FIO_14'),
      MALHA_2: n(p => p.malha === 'MALHA_2'), MALHA_3: n(p => p.malha === 'MALHA_3'),
      ENTREGA: n(p => p.frete.tipo === 'ENTREGA'), RETIRADA: n(p => p.frete.tipo === 'RETIRADA'),
    };
  });

  protected filtrados = computed(() => {
    const termo = normalizar(this.texto());
    return this.fila().filter(p =>
      (!this.fio() || p.fio === this.fio()) &&
      (!this.malha() || p.malha === this.malha()) &&
      (!this.frete() || p.frete.tipo === this.frete()) &&
      (!termo || normalizar([
        p.codigo, p.cliente.nome, p.cliente.cidade, p.cliente.documento, p.destino,
        ROTULO_FIO[p.fio], ROTULO_MALHA[p.malha], this.tratamento(p),
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

  tratamento(p: Pedido): string {
    return this.produtos.produtos().find(x => x.chave === p.tratamento)?.nome ?? (p.tratamento === "PVC" ? "Revestida em PVC" : "Galvanizada a fogo");
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
      `Arame: ${ROTULO_FIO[p.fio]}`,
      `Malha: ${ROTULO_MALHA[p.malha]} losangular`,
      `Tratamento: ${this.tratamento(p)}`,
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
