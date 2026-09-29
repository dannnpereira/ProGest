import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {

  // --- ESTADO DO CONFIGURADOR ---
  bitolaSelecionada: 'fio12' | 'fio14' = 'fio12';
  malhaSelecionada: 'malha2' | 'malha3' = 'malha3';
  alturaMetros: number = 2.0;
  comprimentoMetros: number = 120;
  tratamentoSelecionado: 'galvanizado' | 'pvc' = 'galvanizado';
  tipoFrete: 'entrega' | 'retirada' = 'entrega';
  cep: string = '';

  // --- PREÇOS BASE DA FÁBRICA ---
  private readonly PRECO_M2_BASE = 18.50;
  private readonly MULTIPLICADOR_FIO12 = 1.35;
  private readonly MULTIPLICADOR_MALHA2 = 1.25;
  private readonly MULTIPLICADOR_PVC = 1.20;
  private readonly PRECO_ACESSORIO_METRO = 2.83;
  private readonly TAXA_FRETE_BASE = 180.00;

  // --- CÁLCULOS DINÂMICOS ---
  get areaTotal(): number {
    return this.alturaMetros * this.comprimentoMetros;
  }

  get totalRolos(): number {
    return Math.ceil(this.comprimentoMetros / 15);
  }

  get valorMateriaPrima(): number {
    let precoM2 = this.PRECO_M2_BASE;
    if (this.bitolaSelecionada === 'fio12') precoM2 *= this.MULTIPLICADOR_FIO12;
    if (this.malhaSelecionada === 'malha2') precoM2 *= this.MULTIPLICADOR_MALHA2;
    if (this.tratamentoSelecionado === 'pvc') precoM2 *= this.MULTIPLICADOR_PVC;
    return this.areaTotal * precoM2;
  }

  get valorAcessorios(): number {
    return this.comprimentoMetros * this.PRECO_ACESSORIO_METRO;
  }

  get valorFrete(): number {
    return this.tipoFrete === 'entrega' ? this.TAXA_FRETE_BASE : 0;
  }

  get subtotal(): number {
    return this.valorMateriaPrima + this.valorAcessorios + this.valorFrete;
  }

  get valorDesconto(): number {
    return this.subtotal * 0.05;
  }

  get valorTotal(): number {
    return this.subtotal - this.valorDesconto;
  }

  get valorParcela(): number {
    return this.valorTotal / 10;
  }

  // --- MÉTODOS DE ATUALIZAÇÃO ---
  atualizarAltura(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.alturaMetros = Number(input.value) || 1;
  }

  atualizarComprimentoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.comprimentoMetros = Number(input.value) || 10;
  }

  alterarComprimento(delta: number): void {
    const novoValor = this.comprimentoMetros + delta;
    if (novoValor >= 10) {
      this.comprimentoMetros = novoValor;
    }
  }

  atualizarCep(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.cep = input.value;
  }
}