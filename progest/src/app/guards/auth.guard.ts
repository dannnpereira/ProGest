import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Se a pessoa não está logada, manda para /login e guarda a rota pedida
// em ?returnUrl=... para voltar para ela depois do login.
// Atenção: isto é só conforto de uso. A proteção real dos dados
// precisa estar no backend, validando o token em cada requisição.
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.logado) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};