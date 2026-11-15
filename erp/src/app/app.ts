import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Icone } from './shared/icone';
import { AvisosService } from './core/avisos.service';

// Raiz do ERP: a tela de login aparece sozinha; as demais ficam dentro do Layout.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Icone],
  template: `
    <router-outlet />

    @if (avisos.atual(); as aviso) {
      <div class="toast" role="status" aria-live="polite">
        <span>{{ aviso.texto }}</span>
        @if (aviso.acao; as acao) {
          <button type="button" (click)="acao.executar(); avisos.fechar()">{{ acao.rotulo }}</button>
        }
        <button type="button" aria-label="Fechar aviso" (click)="avisos.fechar()"><app-icone nome="x" [tamanho]="16" /></button>
      </div>
    }
  `,
})
export class App {
  protected avisos = inject(AvisosService);
}
