import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Icone } from '../shared/icone';
import { PedidosService } from '../core/pedidos.service';
import { SessaoService, telaInicial } from '../core/sessao.service';
import { doisDigitos } from '../core/formato';

interface ItemMenu {
  rota: string;
  rotulo: string;
  icone: string;
}

// Menu lateral + topo, em volta de todas as telas do painel (menos o login)
@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icone],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
  host: { '(document:keydown)': 'atalho($event)' },
})
export class Layout {
  private router = inject(Router);
  protected pedidos = inject(PedidosService);
  protected sessao = inject(SessaoService);

  private campoBusca = viewChild<ElementRef<HTMLInputElement>>('campoBusca');

  private readonly menuCompleto: (ItemMenu & { soAdmin: boolean })[] = [
    { rota: '/aprovacao', rotulo: 'Aprovação de Pedidos', icone: 'aprovacao', soAdmin: true },
    { rota: '/producao', rotulo: 'Produção e Entregas', icone: 'producao', soAdmin: false },
    { rota: '/produtos', rotulo: 'Produtos e Valores', icone: 'produtos', soAdmin: true },
    { rota: '/financeiro', rotulo: 'Financeiro', icone: 'financeiro', soAdmin: true },
    { rota: '/configuracoes', rotulo: 'Configurações', icone: 'config', soAdmin: true },
  ];

  /** Funcionário só vê Produção e Entregas */
  protected menu = computed(() => this.menuCompleto.filter(i => this.sessao.ehAdmin() || !i.soAdmin));
  protected inicio = computed(() => telaInicial(this.sessao.perfil()));
  protected rotuloPerfil = computed(() => (this.sessao.ehAdmin() ? 'Administrador' : 'Funcionário'));

  protected menuAberto = signal(false);
  protected notificacoesAbertas = signal(false);
  protected novos = computed(() => this.pedidos.fila().length);
  protected novosTexto = computed(() => doisDigitos(this.novos()));

  constructor() {
    // Pedidos do site: busca ao abrir o painel (lista do perfil de quem entrou)
    this.pedidos.carregar();

    // Fecha o menu do celular ao trocar de tela
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.menuAberto.set(false);
      this.notificacoesAbertas.set(false);
    });
  }

  buscar(termo: string): void {
    const q = termo.trim();
    this.router.navigate(['/aprovacao'], { queryParams: q ? { q } : {} });
  }

  atalho(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.campoBusca()?.nativeElement.focus();
    }
    if (e.key === 'Escape') {
      this.menuAberto.set(false);
      this.notificacoesAbertas.set(false);
    }
  }

  sair(): void {
    this.sessao.sair();
  }
}
