import { Component, inject, signal } from '@angular/core';
import { Icone } from '../../shared/icone';
import { AvisosService } from '../../core/avisos.service';
import { gravar, ler, limparTudo } from '../../core/armazenamento';

interface Empresa {
  razaoSocial: string;
  cnpj: string;
  whatsapp: string;
  origemFrete: string;
}

const EMPRESA_PADRAO = (): Empresa => ({
  razaoSocial: 'Amaral Alambrados',
  cnpj: '',
  whatsapp: '',
  origemFrete: 'Sorocaba/SP',
});

@Component({
  selector: 'app-configuracoes',
  imports: [Icone],
  templateUrl: './configuracoes.html',
  styles: [`
    .grade { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; align-items: start; }
    .bloco-head { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
    .card-sub { margin-bottom: 16px; }
    .confirmar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 12px; border-radius: 8px; background: var(--bad-soft); }
    .confirmar p { flex: 1 1 200px; font-size: 13px; color: var(--bad); font-weight: 500; }
    .info { font-size: 13px; color: var(--ink-2); line-height: 1.6; margin-bottom: 14px; }
  `],
})
export class Configuracoes {
  private avisos = inject(AvisosService);

  protected empresa = signal<Empresa>(ler('empresa', EMPRESA_PADRAO));
  protected confirmandoReset = signal(false);

  campo(chave: keyof Empresa, e: Event): void {
    const valor = (e.target as HTMLInputElement).value;
    this.empresa.update(x => ({ ...x, [chave]: valor }));
  }

  salvar(): void {
    gravar('empresa', this.empresa());
    this.avisos.mostrar({ texto: 'Dados da empresa salvos.' });
  }

  restaurar(): void {
    limparTudo();
    // Recarrega para todos os serviços voltarem aos dados de exemplo
    window.location.reload();
  }
}
