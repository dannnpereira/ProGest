import { Routes } from '@angular/router';
import { exigeLogin, paraTelaInicial, somenteAdmin, somenteDeslogado } from './core/sessao.guard';
import { Layout } from './layout/layout';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Entrar | ProGest',
    canActivate: [somenteDeslogado],
    loadComponent: () => import('./paginas/login/login').then(m => m.Login),
  },
  {
    // Todas as telas do painel ficam dentro do layout (menu + topo) e exigem login
    path: '',
    component: Layout,
    canActivate: [exigeLogin],
    children: [
      // Admin abre em Aprovação; funcionário em Produção
      { path: '', pathMatch: 'full', redirectTo: paraTelaInicial },
      {
        path: 'aprovacao',
        canActivate: [somenteAdmin],
        title: 'Aprovação de Pedidos | ProGest',
        loadComponent: () => import('./paginas/aprovacao/aprovacao').then(m => m.Aprovacao),
      },
      {
        // Única tela do funcionário
        path: 'producao',
        title: 'Produção e Entregas | ProGest',
        loadComponent: () => import('./paginas/producao/producao').then(m => m.Producao),
      },
      {
        path: 'orcamento',
        canActivate: [somenteAdmin],
        title: 'Novo Orçamento | ProGest',
        loadComponent: () => import('./paginas/orcamento/orcamento').then(m => m.Orcamento),
      },
      {
        path: 'produtos',
        canActivate: [somenteAdmin],
        title: 'Produtos e Valores | ProGest',
        loadComponent: () => import('./paginas/produtos/produtos').then(m => m.Produtos),
      },
      {
        path: 'financeiro',
        canActivate: [somenteAdmin],
        title: 'Financeiro | ProGest',
        loadComponent: () => import('./paginas/financeiro/financeiro').then(m => m.Financeiro),
      },
      {
        path: 'configuracoes',
        canActivate: [somenteAdmin],
        title: 'Configurações | ProGest',
        loadComponent: () => import('./paginas/configuracoes/configuracoes').then(m => m.Configuracoes),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
