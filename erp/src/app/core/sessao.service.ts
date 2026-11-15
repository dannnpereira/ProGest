import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

export interface UsuarioErp {
  id: number;
  nome: string;
  email: string;
}

interface SessaoGuardada {
  token: string;
  expiraEm: string;
  usuario: UsuarioErp;
}

// Fora do prefixo "progest-erp:" de propósito: "Restaurar dados de exemplo"
// apaga aquele prefixo e não deve deslogar ninguém.
const CHAVE = 'progest-erp-sessao';

/**
 * Login do painel. O backend devolve um token que vai em toda chamada para
 * /api/erp/** (ver token.interceptor.ts).
 * "Manter conectado" guarda no localStorage; sem ele, no sessionStorage,
 * que é apagado quando a aba é fechada.
 */
@Injectable({ providedIn: 'root' })
export class SessaoService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private sessao = signal<SessaoGuardada | null>(lerGuardada());
  private conferida = false;

  readonly usuario = computed(() => this.sessao()?.usuario ?? null);
  readonly logado = computed(() => this.sessao() !== null);

  get token(): string | null {
    return this.sessao()?.token ?? null;
  }

  async entrar(email: string, senha: string, manterConectado: boolean): Promise<void> {
    const resp = await firstValueFrom(
      this.http.post<SessaoGuardada>('/api/auth/erp/login', { email: email.trim(), senha }),
    );
    limparGuardada();
    try {
      (manterConectado ? localStorage : sessionStorage).setItem(CHAVE, JSON.stringify(resp));
    } catch {
      // sem armazenamento: a sessão vale até recarregar a página
    }
    this.sessao.set(resp);
    this.conferida = true;
  }

  /**
   * Confirma com o backend, uma vez por carregamento, que o token guardado ainda vale
   * (o backend esquece as sessões quando reinicia). Se o servidor estiver fora do ar,
   * mantém a sessão para o painel continuar abrindo.
   */
  async conferir(): Promise<boolean> {
    if (!this.sessao()) return false;
    if (this.expirou()) {
      this.encerrarLocal();
      return false;
    }
    if (this.conferida) return true;
    try {
      const usuario = await firstValueFrom(this.http.get<UsuarioErp>('/api/erp/sessao'));
      this.sessao.update(s => (s ? { ...s, usuario } : s));
      this.conferida = true;
      return true;
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 401) {
        this.encerrarLocal();
        return false;
      }
      return true;
    }
  }

  async sair(): Promise<void> {
    if (this.token) {
      try {
        await firstValueFrom(this.http.delete('/api/erp/sessao'));
      } catch {
        // mesmo sem resposta do servidor, a sessão local é encerrada
      }
    }
    this.encerrarLocal();
    await this.router.navigate(['/login']);
  }

  /** Usado quando o backend responde 401: a sessão acabou do lado de lá. */
  expirarSessao(): void {
    const volta = this.router.url;
    this.encerrarLocal();
    this.router.navigate(['/login'], { queryParams: { expirou: 1, volta } });
  }

  private expirou(): boolean {
    const s = this.sessao();
    return !!s && new Date(s.expiraEm).getTime() <= Date.now();
  }

  private encerrarLocal(): void {
    limparGuardada();
    this.sessao.set(null);
    this.conferida = false;
  }
}

function lerGuardada(): SessaoGuardada | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE) ?? localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as SessaoGuardada) : null;
  } catch {
    return null;
  }
}

function limparGuardada(): void {
  try {
    localStorage.removeItem(CHAVE);
    sessionStorage.removeItem(CHAVE);
  } catch {
    // nada a fazer
  }
}
