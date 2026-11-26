import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
}

export interface DadosCadastro {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  senha: string;
}

interface Sessao {
  token: string;
  expiraEm: string;
  usuario: Usuario;
}

// Sessão antiga (sem token) das primeiras versões: é descartada
const CHAVE_ANTIGA = 'progest_usuario';
const CHAVE = 'progest_sessao';

/**
 * Login do cliente no site. O backend devolve um token que vai no cabeçalho das
 * chamadas para /api/conta/** (perfil e pedidos) — ver auth.interceptor.ts.
 * "Lembrar de mim" guarda no localStorage; sem ele, no sessionStorage.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly api = '/api/auth';

  private sessao = signal<Sessao | null>(lerSessao());

  readonly usuarioAtual = computed(() => this.sessao()?.usuario ?? null);
  readonly estaLogado = computed(() => this.sessao() !== null);

  /** Mantidos para as telas que já usavam auth.usuario / auth.logado */
  get usuario(): Usuario | null {
    return this.usuarioAtual();
  }

  get logado(): boolean {
    return this.estaLogado();
  }

  get token(): string | null {
    return this.sessao()?.token ?? null;
  }

  login(email: string, senha: string, lembrar = false): Observable<Usuario> {
    return this.http
      .post<Sessao>(`${this.api}/login`, { email: email.trim(), senha })
      .pipe(tap(s => this.guardar(s, lembrar)), map(s => s.usuario));
  }

  cadastrar(dados: DadosCadastro): Observable<Usuario> {
    return this.http
      .post<Sessao>(`${this.api}/cadastro`, dados)
      .pipe(tap(s => this.guardar(s, false)), map(s => s.usuario));
  }

  /** Diz se CPF e/ou e-mail já têm conta (para avisar antes de enviar o cadastro). */
  disponibilidade(cpf: string, email: string): Observable<{ cpfEmUso: boolean; emailEmUso: boolean }> {
    return this.http.post<{ cpfEmUso: boolean; emailEmUso: boolean }>(`${this.api}/disponibilidade`, { cpf, email });
  }

  /**
   * "Esqueceu a senha?": o servidor manda o link por e-mail se houver conta.
   * A resposta é a mesma com ou sem conta (não revela quem é cliente).
   */
  esqueciSenha(email: string): Observable<void> {
    return this.http.post<void>(`${this.api}/esqueci-senha`, { email: email.trim() });
  }

  /** Confere se o link de nova senha ainda vale (erro 400 = usado, vencido ou substituído). */
  validarLinkSenha(token: string): Observable<void> {
    return this.http.post<void>(`${this.api}/redefinir-senha/validar`, { token });
  }

  /** Grava a senha nova. Depois disso as sessões abertas do cliente são encerradas. */
  redefinirSenha(token: string, senha: string): Observable<void> {
    return this.http.post<void>(`${this.api}/redefinir-senha`, { token, senha }).pipe(tap(() => this.limpar()));
  }

  /** Sai no servidor (invalida o token) e no navegador. */
  sair(): void {
    if (this.token) {
      this.http.post(`${this.api}/sair`, {}, { headers: { Authorization: `Bearer ${this.token}` } })
        .subscribe({ error: () => {} });
    }
    this.limpar();
  }

  /** A sessão acabou do lado do servidor (ex.: backend reiniciou). */
  limpar(): void {
    apagarSessao();
    this.sessao.set(null);
  }

  private guardar(s: Sessao, lembrar: boolean): void {
    apagarSessao();
    try {
      (lembrar ? localStorage : sessionStorage).setItem(CHAVE, JSON.stringify(s));
    } catch {
      // sem armazenamento: a sessão vale até recarregar a página
    }
    this.sessao.set(s);
  }
}

function lerSessao(): Sessao | null {
  try {
    localStorage.removeItem(CHAVE_ANTIGA);
    sessionStorage.removeItem(CHAVE_ANTIGA);
    const bruto = sessionStorage.getItem(CHAVE) ?? localStorage.getItem(CHAVE);
    const s = bruto ? (JSON.parse(bruto) as Sessao) : null;
    if (!s?.token || new Date(s.expiraEm).getTime() <= Date.now()) {
      apagarSessao();
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function apagarSessao(): void {
  try {
    localStorage.removeItem(CHAVE);
    sessionStorage.removeItem(CHAVE);
  } catch {
    // nada a fazer
  }
}
