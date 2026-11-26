import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/** Mesma regra do cadastro e do backend */
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SENHA_MIN = 8;
export const SENHA_MAX = 72;

type Etapa =
  | 'pedir'      // informar o e-mail
  | 'enviado'    // "verifique seu e-mail"
  | 'validando'  // abriu o link: conferindo se ainda vale
  | 'nova'       // formulário da senha nova
  | 'invalido'   // link usado, vencido ou substituído
  | 'concluido'; // senha trocada

/**
 * Recuperação de senha do cliente.
 * /recuperar-senha               → pede o link por e-mail
 * /redefinir-senha?token=...     → cria a senha nova (link do e-mail ou enviado pela fábrica)
 */
@Component({
  selector: 'app-recuperar-senha',
  imports: [RouterLink],
  templateUrl: './recuperar-senha.html',
  styleUrls: ['../tela-de-login/login.component.css', './recuperar-senha.css'],
})
export class RecuperarSenhaComponent {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly SENHA_MIN = SENHA_MIN;

  etapa = signal<Etapa>('pedir');
  enviando = signal(false);
  erro = signal('');
  tentou = signal(false);

  email = signal('');
  senha = signal('');
  confirmacao = signal('');
  mostrarSenha = signal(false);

  /** O token sai da barra de endereço assim que a tela abre (fica só na memória). */
  private token = '';

  readonly emailInvalido = computed(() => !FORMATO_EMAIL.test(this.email().trim()));
  readonly senhaInvalida = computed(() => this.senha().length < SENHA_MIN || this.senha().length > SENHA_MAX);
  readonly senhasDiferentes = computed(() => this.senha() !== this.confirmacao());
  readonly forca = computed(() => forcaDaSenha(this.senha()));

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.token = token;
      this.etapa.set('validando');
      // Tira o token do endereço (histórico do navegador, prints, compartilhamento)
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
      this.auth.validarLinkSenha(token).subscribe({
        next: () => this.etapa.set('nova'),
        error: (e: HttpErrorResponse) => {
          if (e.status === 0) {
            this.erro.set('Sem conexão com o servidor. Recarregue a página para tentar de novo.');
            this.etapa.set('nova');
          } else {
            this.etapa.set('invalido');
          }
        },
      });
    }
  }

  campo(sinal: { set(v: string): void }, evento: Event): void {
    sinal.set((evento.target as HTMLInputElement).value);
    this.erro.set('');
  }

  pedirLink(): void {
    this.tentou.set(true);
    if (this.emailInvalido() || this.enviando()) return;
    this.enviando.set(true);
    this.auth.esqueciSenha(this.email()).subscribe({
      next: () => {
        this.enviando.set(false);
        this.tentou.set(false);
        this.etapa.set('enviado');
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        this.erro.set(e.status === 0
          ? 'Sem conexão com o servidor. Tente de novo.'
          : 'Não foi possível enviar agora. Tente de novo em alguns minutos.');
      },
    });
  }

  salvarSenha(): void {
    this.tentou.set(true);
    if (this.senhaInvalida() || this.senhasDiferentes() || this.enviando()) return;
    this.enviando.set(true);
    this.auth.redefinirSenha(this.token, this.senha()).subscribe({
      next: () => {
        this.enviando.set(false);
        this.token = '';
        this.senha.set('');
        this.confirmacao.set('');
        this.etapa.set('concluido');
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        if (e.status === 0) {
          this.erro.set('Sem conexão com o servidor. Tente de novo.');
        } else if (e.status === 400 && this.senhaInvalida() === false) {
          // Senha válida recusada = o link deixou de valer enquanto a tela estava aberta
          this.etapa.set('invalido');
        } else {
          this.erro.set('Não foi possível salvar a senha. Tente de novo.');
        }
      },
    });
  }

  /** E-mail com parte escondida para a mensagem de confirmação (ma***@gmail.com). */
  emailMascarado(): string {
    const [usuario, dominio] = this.email().trim().split('@');
    if (!dominio) return this.email();
    return `${usuario.slice(0, 2)}***@${dominio}`;
  }

  pedirDeNovo(): void {
    this.etapa.set('pedir');
    this.erro.set('');
    this.tentou.set(false);
  }
}

/** 0 a 3: comprimento e variedade de caracteres (só uma dica visual). */
export function forcaDaSenha(senha: string): number {
  if (senha.length < SENHA_MIN) return 0;
  const tipos = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(senha)).length;
  if (senha.length >= 12 && tipos >= 3) return 3;
  if (senha.length >= 10 || tipos >= 3) return 2;
  return 1;
}
