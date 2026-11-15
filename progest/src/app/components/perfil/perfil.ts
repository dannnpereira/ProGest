import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ContaService, Perfil } from '../../services/conta.service';

// Tela "Meu perfil": mostra os dados informados no cadastro.
@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './perfil.html',
  // Reaproveita o cabeçalho e os botões da tela de pedidos
  styleUrls: ['../tela-de-rastreio/rastreio.css', './perfil.css'],
})
export class PerfilComponent implements OnInit {
  protected auth = inject(AuthService);
  private conta = inject(ContaService);
  private router = inject(Router);

  perfil = signal<Perfil | null>(null);
  carregando = signal(true);
  erro = signal('');

  get nomeCompleto(): string {
    return this.perfil()?.nome ?? this.auth.usuario?.nome ?? '';
  }

  get iniciais(): string {
    const partes = this.nomeCompleto.trim().split(/\s+/).filter(Boolean);
    return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
  }

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set('');
    this.conta.perfil().subscribe({
      next: p => {
        this.perfil.set(p);
        this.carregando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        // 401 já leva para o login (auth.interceptor)
        if (e.status !== 401) this.erro.set('Não foi possível carregar seus dados. Tente de novo em instantes.');
        this.carregando.set(false);
      },
    });
  }

  sair(): void {
    this.auth.sair();
    this.router.navigateByUrl('/');
  }
}
