import { Component, signal, inject } from '@angular/core';
import {
  AbstractControl, FormBuilder, ReactiveFormsModule,
  ValidationErrors, Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    remember: [false],
  });

  setMode(mode: 'login' | 'register') {
    this.mode.set(mode);
    this.erro.set('');
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

    const dados = this.form.getRawValue();
    // Não use console.log com CPF/senha: são dados pessoais (LGPD)
    const requisicao = this.mode() === 'login'
      ? this.auth.login(dados.email, dados.password, dados.remember)
      : this.auth.cadastrar({
          nome: dados.nome,
          cpf: dados.cpf.replace(/\D/g, ''),
          telefone: dados.telefone,
          email: dados.email,
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
        this.erro.set(this.mensagemDeErro(e));
      },
    });
  }

  private mensagemDeErro(e: HttpErrorResponse): string {
    const doServidor = typeof e.error?.message === 'string' ? e.error.message : '';
    switch (e.status) {
      case 0:
      case 502:
      case 504:
        return 'Não foi possível conectar ao servidor. Tente novamente em instantes.';
      case 401:
        return 'E-mail ou senha incorretos.';
      case 409:
        return doServidor || 'Já existe uma conta com estes dados.';
      case 429:
        return 'Muitas tentativas seguidas. Aguarde um minuto e tente novamente.';
      case 400:
        return doServidor === 'CPF inválido.' ? doServidor : 'Verifique os dados informados.';
      default:
        return 'Algo deu errado. Tente novamente.';
    }
  }
}