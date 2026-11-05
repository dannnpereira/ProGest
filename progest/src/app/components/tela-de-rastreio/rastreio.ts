import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RastreioService } from '../../services/rastreio.service';
import { Etapa, EstadoEtapa, Pedido, StatusPedido } from '../../services/pedido';

const ROTULOS_STATUS: Record<StatusPedido, string> = {
  aguardando_aprovacao: 'Aguardando aprovação',
  recusado: 'Recusado',
  aguardando_producao: 'Aguardando produção',
  em_producao: 'Em produção',
  ag_entrega: 'Aguardando entrega',
  ag_retirada: 'Aguardando retirada',
  finalizado: 'Finalizado'
};

const CLASSES_STATUS: Record<StatusPedido, string> = {
  aguardando_aprovacao: 'st-aguardando',
  aguardando_producao: 'st-aguardando',
  em_producao: 'st-producao',
  ag_entrega: 'st-pronto',
  ag_retirada: 'st-pronto',
  finalizado: 'st-finalizado',
  recusado: 'st-recusado'
};

@Component({
  selector: 'app-rastreio',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './rastreio.html',
  styleUrl: './rastreio.css'
})
export class RastreioComponent implements OnInit {
  private auth = inject(AuthService);
  private rastreio = inject(RastreioService);
  private router = inject(Router);

  pedidos = signal<Pedido[]>([]);
  carregando = signal(true);
  erro = signal('');
  filtro = signal('');
  selecionadoId = signal<number | null>(null);

  pedidoSelecionado = computed(
    () => this.pedidos().find((p) => p.id === this.selecionadoId()) ?? null
  );

  pedidosFiltrados = computed(() => {
    const termo = this.filtro().trim().toLowerCase();
    const lista = this.pedidos();
    if (!termo) return lista;
    return lista.filter(
      (p) =>
        p.codigo.toLowerCase().includes(termo) ||
        this.resumo(p).toLowerCase().includes(termo) ||
        (p.enderecoEntrega ?? '').toLowerCase().includes(termo)
    );
  });

  get primeiroNome(): string {
    return this.auth.usuario?.nome?.split(' ')[0] ?? '';
  }

  get nomeCompleto(): string {
    return this.auth.usuario?.nome ?? '';
  }

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set('');

    this.rastreio.listarMeusPedidos().subscribe({
      next: (lista) => {
        const ordenados = [...lista].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
        this.pedidos.set(ordenados);
        // Abre primeiro o pedido mais recente que ainda está andando
        const emAndamento = ordenados.find(
          (p) => p.status !== 'finalizado' && p.status !== 'recusado'
        );
        this.selecionadoId.set((emAndamento ?? ordenados[0])?.id ?? null);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar seus pedidos. Tente de novo em instantes.');
        this.carregando.set(false);
      }
    });
  }

  selecionar(pedido: Pedido): void {
    this.selecionadoId.set(pedido.id);
    // Leva a pessoa até o andamento, útil no celular
    setTimeout(() => {
      document
        .getElementById('detalhe-pedido')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  atualizarFiltro(evento: Event): void {
    this.filtro.set((evento.target as HTMLInputElement).value);
  }

  sair(): void {
    this.auth.sair();
    this.router.navigateByUrl('/');
  }

  // ---------- Textos e estilos ----------

  rotuloStatus(status: StatusPedido): string {
    return ROTULOS_STATUS[status];
  }

  classeStatus(status: StatusPedido): string {
    return CLASSES_STATUS[status];
  }

  private rotuloBitola(p: Pedido): string {
    return p.bitola === 'fio12' ? 'Fio 12 (2,77 mm)' : 'Fio 14 (2,10 mm)';
  }

  private rotuloMalha(p: Pedido): string {
    return p.malha === 'malha2' ? 'Malha 2"' : 'Malha 3"';
  }

  private rotuloTratamento(p: Pedido): string {
    return p.tratamento === 'galvanizado' ? 'Galvanizada a fogo' : 'Revestida em PVC';
  }

  private numeroBR(valor: number): string {
    return valor.toString().replace('.', ',');
  }

  composicao(p: Pedido): string[] {
    return [
      this.rotuloBitola(p),
      this.rotuloMalha(p),
      `${this.numeroBR(p.alturaMetros)} m de altura`,
      `${this.numeroBR(p.comprimentoMetros)} m de comprimento`,
      this.rotuloTratamento(p)
    ];
  }

  resumo(p: Pedido): string {
    return `${this.rotuloBitola(p)}, ${this.rotuloMalha(p)}, ${this.numeroBR(
      p.alturaMetros
    )} m x ${this.numeroBR(p.comprimentoMetros)} m, ${this.rotuloTratamento(p)}`;
  }

  destino(p: Pedido): string {
    return p.tipoFrete === 'entrega' ? p.enderecoEntrega ?? 'Entrega técnica' : 'Retirada na fábrica';
  }

  // ---------- Linha do tempo ----------

  private etapaAtual(p: Pedido): number {
    switch (p.status) {
      case 'aguardando_aprovacao':
      case 'recusado':
        return 0;
      case 'aguardando_producao':
        return p.pagamentoConfirmado ? 2 : 1;
      case 'em_producao':
        return 2;
      case 'ag_entrega':
      case 'ag_retirada':
        return 3;
      case 'finalizado':
        return 4;
    }
  }

  private estadoEtapa(p: Pedido, indice: number, atual: number): EstadoEtapa {
    if (p.status === 'recusado') return indice === 0 ? 'recusada' : 'pendente';
    if (p.status === 'finalizado') return 'concluida';
    if (indice < atual) return 'concluida';
    if (indice === atual) return 'atual';
    return 'pendente';
  }

  etapas(p: Pedido): Etapa[] {
    const atual = this.etapaAtual(p);
    const entrega = p.tipoFrete === 'entrega';

    const base: Pick<Etapa, 'chave' | 'titulo' | 'descricao'>[] = [
      {
        chave: 'aprovacao',
        titulo: 'Aprovação',
        descricao: 'A fábrica confere medidas e materiais do pedido.'
      },
      {
        chave: 'pagamento',
        titulo: 'Pagamento',
        descricao: 'Confirmação do pagamento do pedido.'
      },
      {
        chave: 'producao',
        titulo: 'Produção',
        descricao:
          p.status === 'aguardando_producao'
            ? 'Na fila para começar a fabricação.'
            : 'Fabricação da tela sob medida.'
      },
      {
        chave: 'expedicao',
        titulo: entrega ? 'Aguardando entrega' : 'Aguardando retirada',
        descricao: entrega
          ? 'Carga separada e rota de entrega definida.'
          : 'Pedido pronto para retirar na fábrica.'
      },
      {
        chave: 'finalizado',
        titulo: 'Finalizado',
        descricao: entrega ? 'Pedido entregue no endereço.' : 'Pedido retirado na fábrica.'
      }
    ];

    return base.map((etapa, i) => ({
      ...etapa,
      estado: this.estadoEtapa(p, i, atual),
      data: p.datas[etapa.chave]
    }));
  }

  marcador(etapa: Etapa, indice: number): string {
    if (etapa.estado === 'concluida') return '✓';
    if (etapa.estado === 'recusada') return '✕';
    return String(indice + 1);
  }
}