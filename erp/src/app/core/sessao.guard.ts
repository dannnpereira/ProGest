import { inject } from '@angular/core';
import { CanActivateFn, RedirectFunction, Router } from '@angular/router';
import { SessaoService, telaInicial } from './sessao.service';

/** Telas do painel: sem sessão válida, manda para o login e depois volta para onde estava. */
export const exigeLogin: CanActivateFn = async (_rota, estado) => {
  const sessao = inject(SessaoService);
  const router = inject(Router);
  if (await sessao.conferir()) return true;
  return router.createUrlTree(['/login'], { queryParams: { volta: estado.url } });
};

/** Telas só do administrador: funcionário vai para a tela dele (Produção). */
export const somenteAdmin: CanActivateFn = () => {
  const sessao = inject(SessaoService);
  return sessao.ehAdmin() ? true : inject(Router).createUrlTree([telaInicial(sessao.perfil())]);
};

/** Tela de login: quem já entrou vai direto para o painel. */
export const somenteDeslogado: CanActivateFn = () => {
  const sessao = inject(SessaoService);
  return sessao.logado() ? inject(Router).createUrlTree([telaInicial(sessao.perfil())]) : true;
};

/** Endereço vazio (/erp/): abre a tela inicial do perfil. */
export const paraTelaInicial: RedirectFunction = () => telaInicial(inject(SessaoService).perfil());
