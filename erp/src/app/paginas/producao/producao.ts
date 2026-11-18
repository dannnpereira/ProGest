import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icone } from '../../shared/icone';
import { PedidosService } from '../../core/pedidos.service';
import { SessaoService } from '../../core/sessao.service';
import { AvisosService } from '../../core/avisos.service';
import { Pedido, StatusPedido } from '../../core/modelos';
import { data, diaMes, doisDigitos, isoDia, moeda, num } from '../../core/formato';

interface Coluna {
  status: StatusPedido;
  titulo: string;
  descricao: string;
  acao?: string;
  icone?: string;
}

@Component({
  selector: 'app-producao',
  imports: [Icone, RouterLink],
  templateUrl: './producao.html',
  styleUrl: './producao.css',
})
export class Producao {
  private svc = inject(PedidosService);
  protected sessao = inject(SessaoService);
  private avisos = inject(AvisosService);

  protected readonly moeda = moeda;
  protected readonly num = num;
  protected readonly diaMes = diaMes;
  protected readonly doisDigitos = doisDigitos;

  // Mesmas etapas do workflow do backend (StatusWorkflow)
  protected readonly colunas: Coluna[] = [
    { status: 'A_FAZER', titulo: 'A fazer', descricao: 'Aprovados, aguardando o tear', acao: 'Iniciar produção', icone: 'play' },
    { status: 'EM_PROCESSO', titulo: 'Em produção', descricao: 'Na fábrica', acao: 'Marcar como entregue', icone: 'caminhao' },
    { status: 'ENTREGUE', titulo: 'Entregue', descricao: 'Últimos 30 dias' },
  ];

  private hoje = isoDia();

  protected porColuna = computed(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - 30);
    const r: Record<string, Pedido[]> = {};
    for (const c of this.colunas) {
      r[c.status] = this.svc.pedidos()
        .filter(p => p.status === c.status)
        .filter(p => c.status !== 'ENTREGUE' || (p.entregueEm && new Date(p.entregueEm) >= limite))
        .sort((a, b) => c.status === 'ENTREGUE'
          ? (b.entregueEm ?? '').localeCompare(a.entregueEm ?? '')
          : (a.previsaoEntrega ?? '').localeCompare(b.previsaoEntrega ?? ''));
    }
    return r;
  });

  protected atrasados = computed(() =>
    this.svc.pedidos().filter(p => this.atrasado(p)),
  );

  protected entreguesMes = computed(() => {
    const mes = this.hoje.slice(0, 7);
    return this.svc.pedidos().filter(p => p.entregueEm && isoDia(new Date(p.entregueEm)).startsWith(mes));
  });

  protected metrosEmProducao = computed(() =>
    this.porColuna()['EM_PROCESSO'].reduce((s, p) => s + p.metragemM, 0),
  );

  atrasado(p: Pedido): boolean {
    return (p.status === 'A_FAZER' || p.status === 'EM_PROCESSO') && !!p.previsaoEntrega && p.previsaoEntrega < this.hoje;
  }

  prazo(p: Pedido): string {
    if (!p.previsaoEntrega) return 'Sem previsão';
    const dias = Math.round((new Date(p.previsaoEntrega + 'T12:00').getTime() - new Date(this.hoje + 'T12:00').getTime()) / 864e5);
    if (dias === 0) return 'Entrega hoje';
    if (dias === 1) return 'Entrega amanhã';
    if (dias < 0) return `Atrasado ${-dias} dia${dias < -1 ? 's' : ''}`;
    return `Entrega em ${data(p.previsaoEntrega).slice(0, 5)}`;
  }

  avancar(p: Pedido, coluna: Coluna): void {
    const antes = this.svc.copia([p.id]);
    if (!this.svc.avancar(p.id)) return;
    const msg = coluna.status === 'A_FAZER'
      ? `Produção do pedido #${p.codigo} iniciada.`
      : `Pedido #${p.codigo} marcado como entregue.`;
    this.avisos.mostrar({ texto: msg, acao: { rotulo: 'Desfazer', executar: () => this.svc.restaurar(antes) } });
  }
}
