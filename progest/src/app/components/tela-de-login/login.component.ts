import { Component, signal, inject } from '@angular/core';
import {
  AbstractControl, FormBuilder, ReactiveFormsModule,
  ValidationErrors, Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';

function cpfValido(c: AbstractControl): ValidationErrors | null {
  const cpf = (c.value ?? '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return { cpf: true };
  const digito = (len: number) => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += +cpf[i] * (len + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digito(9) === +cpf[9] && digito(10) === +cpf[10] ? null : { cpf: true };
}

// Aceita qualquer e-mail no formato algo@dominio.ext, de qualquer provedor, com acentos,
// "+" e subdomínios, e ignora espaços antes/depois (comum no corretor do celular).
// É a mesma regra do backend (ClienteEmail.FORMATO).
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function emailValido(c: AbstractControl): ValidationErrors | null {
  return FORMATO_EMAIL.test((c.value ?? '').trim()) ? null : { email: true };
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private fb = inject(FormBuilder);

  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  mode = signal<'login' | 'register'>('login');
  showPassword = signal(false);
  enviando = signal(false);
  erro = signal('');

  form = this.fb.nonNullable.group({
    nome: [''],
    cpf: [''],
    telefone: [''],
    email: ['', [Validators.required, emailValido]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    remember: [false],
  });

  // Conta já existente com o CPF / e-mail digitado (conferido no banco ao sair do campo)
  cpfEmUso = signal(false);
  emailEmUso = signal(false);

  constructor() {
    // Veio de uma sessão que acabou (ex.: servidor reiniciou)
    if (this.route.snapshot.queryParamMap.get('expirou')) {
      this.erro.set('Sua sessão expirou. Entre novamente para continuar.');
    }
    // Mudou o valor: o aviso de "já cadastrado" deixa de valer até conferir de novo
    this.form.controls.cpf.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.cpfEmUso.set(false));
    this.form.controls.email.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.emailEmUso.set(false));
  }

  /** Ao sair do campo CPF ou e-mail no cadastro, pergunta ao banco se já existe conta. */
  conferirCadastro() {
    if (this.mode() !== 'register') return;
    const { cpf, email } = this.form.controls;
    const cpfOk = cpf.valid ? cpf.value.replace(/\D/g, '') : '';
    const emailOk = email.valid ? email.value.trim() : '';
    if (!cpfOk && !emailOk) return;

    this.auth.disponibilidade(cpfOk, emailOk).subscribe({
      next: (r) => {
        // Só aplica se o campo não mudou enquanto a resposta vinha
        if (cpfOk && cpfOk === cpf.value.replace(/\D/g, '')) this.cpfEmUso.set(r.cpfEmUso);
        if (emailOk && emailOk === email.value.trim()) this.emailEmUso.set(r.emailEmUso);
      },
      // Sem resposta (servidor fora, limite de tentativas): o envio do cadastro confere de novo
      error: () => {},
    });
  }

  /** "Já tem conta? Entrar": troca para a aba Entrar mantendo o e-mail. */
  irParaEntrar() {
    this.setMode('login');
    this.form.controls.password.reset('');
  }

  setMode(mode: 'login' | 'register') {
    this.mode.set(mode);
    this.erro.set('');
    this.cpfEmUso.set(false);
    this.emailEmUso.set(false);
    const { nome, cpf, telefone } = this.form.controls;
    if (mode === 'register') {
      nome.setValidators([Validators.required, Validators.minLength(3)]);
      cpf.setValidators([Validators.required, cpfValido]);
      telefone.setValidators([Validators.required, Validators.pattern(/^\(\d{2}\) \d{4,5}-\d{4}$/)]);
    } else {
      [nome, cpf, telefone].forEach(c => c.clearValidators());
    }
    [nome, cpf, telefone].forEach(c => c.updateValueAndValidity());
  }

  maskCpf(e: Event) {
    const input = e.target as HTMLInputElement;
    const v = input.value.replace(/\D/g, '').slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    input.value = v;
    this.form.controls.cpf.setValue(v);
  }

  maskTelefone(e: Event) {
    const input = e.target as HTMLInputElement;
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    else if (v.length > 6) v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/(\d{2})(\d*)/, '($1) $2');
    input.value = v;
    this.form.controls.telefone.setValue(v);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.enviando()) return;
    if (this.mode() === 'register' && (this.cpfEmUso() || this.emailEmUso())) return;

    const dados = this.form.getRawValue();
    const email = dados.email.trim();
    // Não use console.log com CPF/senha: são dados pessoais (LGPD)
    const requisicao = this.mode() === 'login'
      ? this.auth.login(email, dados.password, dados.remember)
      : this.auth.cadastrar({
          nome: dados.nome.trim(),
          cpf: dados.cpf.replace(/\D/g, ''),
          telefone: dados.telefone,
          email,
          senha: dados.password,
        });

    this.erro.set('');
    this.enviando.set(true);
    requisicao.subscribe({
      next: () => {
        this.enviando.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        // Só aceita rotas internas, para não redirecionar para outro site
        const destino = returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/';
        this.router.navigateByUrl(destino);
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        if (e.status === 409) {
          // Marca o campo certo; a mensagem aparece embaixo dele
          const msg = String(e.error?.message ?? '');
          this.cpfEmUso.set(msg.includes('CPF'));
          this.emailEmUso.set(msg.includes('e-mail'));
        }
        this.erro.set(this.mensagemDeErro(e));
      },
    });
  }

  private mensagemDeErro(e: HttpErrorResponse): string {
    const doServidor = typeof e.error?.message === 'string' ? e.error.message : '';
    if (e.status === 429) {
      return 'Muitas tentativas seguidas. Aguarde um minuto e tente novamente.';
    }
    // Toda resposta do backend (Spring) traz "timestamp". Sem ele, quem respondeu foi
    // outro servidor: proxy do "npm start" sem backend, Vercel devolvendo a página do
    // site (backend ainda não publicado) ou backend acordando no Render.
    if (e.status === 0 || !e.error?.timestamp) {
      return 'Não foi possível conectar ao servidor. Tente novamente em instantes.';
    }
    switch (e.status) {
      case 401:
        return 'E-mail ou senha incorretos.';
      case 409:
        return doServidor || 'Já existe uma conta com estes dados.';
      case 400:
        return ['CPF inválido.', 'E-mail inválido.'].includes(doServidor) ? doServidor : 'Verifique os dados informados.';
      default:
        return 'Algo deu errado. Tente novamente.';
    }
  }
}