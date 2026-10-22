import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home';
import { LoginComponent } from './components/tela-de-login/login.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: '**', redirectTo: '' } // Opcional: redireciona rotas inválidas para a home
];