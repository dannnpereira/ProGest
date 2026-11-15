import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessaoService } from './sessao.service';

/** Telas do painel: sem sessão válida, manda para o login e depois volta para onde estava. */
export const exigeLogin: CanActivateFn = async (_rota, estado) => {
  const sessao = inject(SessaoService);
  const router = inject(Router);
  if (await sessao.conferir()) return true;
  return router.createUrlTree(['/login'], { queryParams: { volta: estado.url } });
};

/** Tela de login: quem já entrou vai direto para o painel. */
export const somenteDeslogado: CanActivateFn = () => {
  const sessao = inject(SessaoService);
  return sessao.logado() ? inject(Router).createUrlTree(['/aprovacao']) : true;
};
