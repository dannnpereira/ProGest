import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

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

// Fala com o backend (Spring Boot + H2) em /api/auth.
// Em desenvolvimento, o `ng serve` encaminha /api para http://localhost:8081 (proxy.conf.json).
// O usuário logado fica no navegador: localStorage se marcou "Lembrar de mim",
// senão sessionStorage (some ao fechar o navegador).
// Ainda não há token: quando o backend emitir um (JWT), guarde-o aqui e envie-o
// no cabeçalho Authorization das requisições (interceptor).
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly chave = 'progest_usuario';
  private readonly api = '/api/auth';

  get usuario(): Usuario | null {
    try {
      const bruto = localStorage.getItem(this.chave) ?? sessionStorage.getItem(this.chave);
      return bruto ? (JSON.parse(bruto) as Usuario) : null;
    } catch {
      return null;
    }
  }

  get logado(): boolean {
    return this.usuario !== null;
  }

  login(email: string, senha: string, lembrar = false): Observable<Usuario> {
    return this.http
      .post<Usuario>(`${this.api}/login`, { email, senha })
      .pipe(tap(usuario => this.entrar(usuario, lembrar)));
  }

  cadastrar(dados: DadosCadastro): Observable<Usuario> {
    return this.http
      .post<Usuario>(`${this.api}/cadastro`, dados)
      .pipe(tap(usuario => this.entrar(usuario)));
  }

  entrar(usuario: Usuario, lembrar = false): void {
    try {
      this.sair();
      (lembrar ? localStorage : sessionStorage).setItem(this.chave, JSON.stringify(usuario));
    } catch {
      // armazenamento indisponível: a pessoa continua deslogada
    }
  }

  sair(): void {
    try {
      localStorage.removeItem(this.chave);
      sessionStorage.removeItem(this.chave);
    } catch {
      // nada a fazer
    }
  }
}
