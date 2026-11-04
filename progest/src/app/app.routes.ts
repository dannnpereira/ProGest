import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home';
import { LoginComponent } from './components/tela-de-login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  {
    path: 'rastrear',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/tela-de-rastreio/rastreio').then(m => m.RastreioComponent),
  },
  { path: '**', redirectTo: '' },
];