import { Injectable } from '@angular/core';

export interface Usuario {
  nome: string;
  email: string;
}

// Versão provisória: guarda o usuário no navegador.
// Quando o login falar com o backend, guarde aqui o token devolvido pela API
// e envie-o no cabeçalho Authorization das requisições (interceptor).
// Se o projeto já tiver um serviço de login, aproveite-o em vez deste.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly chave = 'progest_usuario';

  get usuario(): Usuario | null {
    try {
      const bruto = localStorage.getItem(this.chave);
      return bruto ? (JSON.parse(bruto) as Usuario) : null;
    } catch {
      return null;
    }
  }

  get logado(): boolean {
    return this.usuario !== null;
  }

  // Chame depois que o login der certo
  entrar(usuario: Usuario): void {
    try {
      localStorage.setItem(this.chave, JSON.stringify(usuario));
    } catch {
      // armazenamento indisponível: a pessoa continua deslogada
    }
  }

  sair(): void {
    try {
      localStorage.removeItem(this.chave);
    } catch {
      // nada a fazer
    }
  }
}