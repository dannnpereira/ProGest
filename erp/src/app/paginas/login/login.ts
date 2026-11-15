import { Component, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Icone } from '../../shared/icone';
import { SessaoService } from '../../core/sessao.service';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-login',
  imports: [Icone],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private sessao = inject(SessaoService);
  private router = inject(Router);

  /** ?volta=/financeiro: tela para onde ir depois de entrar */
  readonly volta = input<string>();
  /** ?expirou=1: veio de uma sessão que acabou */
  readonly expirou = input<string>();

  protected email = signal('');
  protected senha = signal('');
  protected manterConectado = signal(false);
  protected mostrarSenha = signal(false);

  protected tentou = signal(false);
  protected enviando = signal(false);
  protected erro = signal<string | null>(null);

  protected erros = computed(() => ({
    email: !EMAIL_VALIDO.test(this.email().trim()),
    senha: this.senha().length === 0,
  }));

  protected readonly modulos = [
    { icone: 'aprovacao', texto: 'Aprovação dos pedidos do site' },
    { icone: 'producao', texto: 'Produção e entregas' },
    { icone: 'produtos', texto: 'Produtos e valores do orçamento' },
    { icone: 'financeiro', texto: 'Financeiro e compras' },
  ];

  campo(alvo: 'email' | 'senha', e: Event): void {
    const valor = (e.target as HTMLInputElement).value;
    (alvo === 'email' ? this.email : this.senha).set(valor);
    this.erro.set(null);
  }

  async entrar(): Promise<void> {
    this.tentou.set(true);
    if (this.enviando() || this.erros().email || this.erros().senha) return;

    this.enviando.set(true);
    this.erro.set(null);
    try {
      await this.sessao.entrar(this.email(), this.senha(), this.manterConectado());
      await this.router.navigateByUrl(this.destino());
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
      this.senha.set('');
    } finally {
      this.enviando.set(false);
    }
  }

  /** Só aceita caminhos internos do painel, para o ?volta= não levar para outro site. */
  private destino(): string {
    const v = this.volta();
    const seguro = !!v && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/login');
    return seguro ? v : '/aprovacao';
  }
}

function mensagemDeErro(e: unknown): string {
  if (!(e instanceof HttpErrorResponse)) return 'Não foi possível entrar agora. Tente de novo.';
  if (e.status === 429) return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
  // Resposta sem "timestamp" não veio do backend (Spring): servidor fora do ar,
  // ainda não publicado (a Vercel devolve a página do site) ou acordando no Render.
  if (e.status === 0 || !e.error?.timestamp) {
    return 'Não foi possível falar com o servidor. Se ele estava parado, aguarde um minuto e tente de novo.';
  }
  switch (e.status) {
    case 401:
    case 403:
      return e.error?.message ?? 'E-mail ou senha incorretos.';
    case 400:
      return 'Preencha o e-mail e a senha.';
    default:
      return 'Não foi possível entrar agora. Tente de novo.';
  }
}
