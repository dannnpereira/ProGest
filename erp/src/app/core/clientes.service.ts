import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { somenteDigitos } from './documentos';

/** Cliente como a API devolve para o ERP (nunca vem a senha). */
export interface ClienteErp {
  id: number;
  nome: string;
  cpf: string; // só dígitos
  email: string | null;
  telefone: string | null;
  /** false = cliente que só fez pedido e ainda não tem senha */
  temConta: boolean;
}

/** Mesmos dados da aba "Cadastrar" do site. */
export interface NovaConta {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  senha: string;
}

/**
 * Clientes na tela "Novo orçamento".
 * Rotas /api/erp/clientes (só administrador). O CPF vai no corpo, não na URL,
 * para não ficar gravado em logs de acesso.
 */
@Injectable({ providedIn: 'root' })
export class ClientesService {
  private http = inject(HttpClient);

  /** Devolve null quando não há cliente com o CPF. */
  async buscarPorCpf(cpf: string): Promise<ClienteErp | null> {
    try {
      return await firstValueFrom(
        this.http.post<ClienteErp>('/api/erp/clientes/busca', { cpf: somenteDigitos(cpf) }),
      );
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 404) return null;
      throw e;
    }
  }

  /** Cria a conta: o cliente passa a entrar no site com este e-mail e senha. */
  cadastrar(conta: NovaConta): Promise<ClienteErp> {
    return firstValueFrom(this.http.post<ClienteErp>('/api/erp/clientes', {
      ...conta,
      nome: conta.nome.trim(),
      cpf: somenteDigitos(conta.cpf),
      email: conta.email.trim(),
    }));
  }
}

/** Mensagem do servidor ("Este CPF já tem conta...") ou uma genérica. */
export function mensagemDeErro(e: unknown, padrao: string): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return 'Sem conexão com o servidor. Tente de novo.';
    const msg = (e.error as { message?: string } | null)?.message;
    if (msg) return msg;
  }
  return padrao;
}
