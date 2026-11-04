import { Component, signal, inject } from '@angular/core';
import {
  AbstractControl, FormBuilder, ReactiveFormsModule,
  ValidationErrors, Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

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

  mode = signal<'login' | 'register'>('login');
  showPassword = signal(false);

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
    const dados = this.form.getRawValue();
    // TODO: chamar o serviço (login ou cadastro, conforme mode())
    // Não use console.log com CPF/senha: são dados pessoais (LGPD)
  }
}