import { Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';


export class LoginComponent {
  private fb = inject(FormBuilder);

  mode = signal<'login' | 'register'>('login');
  showPassword = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    remember: [false],
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password, remember } = this.form.getRawValue();
    // TODO: chamar seu serviço de autenticação (login ou cadastro, conforme mode())
    console.log(this.mode(), email, remember);
  }
}