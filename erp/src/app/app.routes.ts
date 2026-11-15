import { Routes } from '@angular/router';
import { exigeLogin, somenteDeslogado } from './core/sessao.guard';
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
      { path: '', pathMatch: 'full', redirectTo: 'aprovacao' },
      {
        path: 'aprovacao',
        title: 'Aprovação de Pedidos | ProGest',
        loadComponent: () => import('./paginas/aprovacao/aprovacao').then(m => m.Aprovacao),
      },
      {
        path: 'producao',
        title: 'Produção e Entregas | ProGest',
        loadComponent: () => import('./paginas/producao/producao').then(m => m.Producao),
      },
      {
        path: 'produtos',
        title: 'Produtos e Valores | ProGest',
        loadComponent: () => import('./paginas/produtos/produtos').then(m => m.Produtos),
      },
      {
        path: 'financeiro',
        title: 'Financeiro | ProGest',
        loadComponent: () => import('./paginas/financeiro/financeiro').then(m => m.Financeiro),
      },
      {
        path: 'configuracoes',
        title: 'Configurações | ProGest',
        loadComponent: () => import('./paginas/configuracoes/configuracoes').then(m => m.Configuracoes),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
