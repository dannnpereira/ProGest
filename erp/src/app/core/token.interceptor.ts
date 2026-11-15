import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SessaoService } from './sessao.service';

/**
 * Coloca o token da sessão nas chamadas para /api/erp/ e, se o backend responder 401
 * (sessão expirada ou servidor reiniciado), volta para a tela de login.
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/erp/')) return next(req);

  const sessao = inject(SessaoService);
  const token = sessao.token;
  const comToken = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(comToken).pipe(
    catchError((erro: unknown) => {
      // A própria conferência da sessão trata o 401 dela
      const ehConferencia = req.url === '/api/erp/sessao';
      if (erro instanceof HttpErrorResponse && erro.status === 401 && !ehConferencia) {
        sessao.expirarSessao();
      }
      return throwError(() => erro);
    }),
  );
};
