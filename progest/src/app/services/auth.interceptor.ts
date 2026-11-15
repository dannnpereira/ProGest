import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Coloca o token do cliente nas chamadas para /api/conta/ (perfil e pedidos).
 * Se o backend responder 401 (sessão expirada ou servidor reiniciado),
 * desloga e manda para o login, voltando depois para a mesma tela.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/conta')) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;
  const comToken = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(comToken).pipe(
    catchError((erro: unknown) => {
      if (erro instanceof HttpErrorResponse && erro.status === 401) {
        auth.limpar();
        router.navigate(['/login'], { queryParams: { returnUrl: router.url, expirou: 1 } });
      }
      return throwError(() => erro);
    }),
  );
};
