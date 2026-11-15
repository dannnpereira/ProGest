import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home';
import { LoginComponent } from './components/tela-de-login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  {
    // "Acompanhar pedido" (antes "Rastrear pedido": não há rastreio por GPS)
    path: 'acompanhar',
    title: 'Acompanhar pedido | Amaral Alambrados',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/tela-de-rastreio/rastreio').then(m => m.RastreioComponent),
  },
  {
    path: 'perfil',
    title: 'Meu perfil | Amaral Alambrados',
    canActivate: [authGuard],
    loadComponent: () => import('./components/perfil/perfil').then(m => m.PerfilComponent),
  },
  // Endereço antigo continua funcionando
  { path: 'rastrear', redirectTo: 'acompanhar' },
  { path: '**', redirectTo: '' },
];
