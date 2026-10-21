import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {
  // Propriedades do Configurador
  bitolaSelecionada: 'fio12' | 'fio14' = 'fio12';
  malhaSelecionada: 'malha2' | 'malha3' = 'malha3';
  alturaMetros: number = 2.0;
  comprimentoMetros: number = 50;
  tratamentoSelecionado: 'galvanizado' | 'pvc' = 'galvanizado';
  
  cep: string = '';
  tipoFrete: 'entrega' | 'retirada' = 'retirada';
  
  enderecoCliente: any = null;
  resultadoFrete: any = null;

  // Getters para cálculos automáticos do orçamento
  get areaTotal(): number {
    return this.alturaMetros * this.comprimentoMetros;
  }

  get totalRolos(): number {
    return Math.ceil(this.comprimentoMetros / 15);
  }

  get valorMateriaPrima(): number {
    let precoBasePorMetro = this.bitolaSelecionada === 'fio12' ? 18 : 14;
    if (this.tratamentoSelecionado === 'pvc') {
      precoBasePorMetro += 4;
    }
    return this.areaTotal * precoBasePorMetro;
  }

  get valorAcessorios(): number {
    return this.comprimentoMetros * 3.50; // Custos estimados de mourões/fixadores
  }

  get valorFrete(): number {
    if (this.tipoFrete === 'retirada') return 0;
    return this.resultadoFrete ? this.resultadoFrete.custoTotal : 150;
  }

  get valorDesconto(): number {
    return (this.valorMateriaPrima + this.valorAcessorios) * 0.05;
  }

  get valorTotal(): number {
    return (this.valorMateriaPrima + this.valorAcessorios + this.valorFrete) - this.valorDesconto;
  }

  get valorParcela(): number {
    return this.valorTotal / 10;
  }

  // Métodos de Ação
  atualizarAltura(event: any) {
    this.alturaMetros = parseFloat(event.target.value) || 0;
  }

  atualizarComprimentoInput(event: any) {
    this.comprimentoMetros = parseFloat(event.target.value) || 0;
  }

  alterarComprimento(valor: number) {
    this.comprimentoMetros = Math.max(10, this.comprimentoMetros + valor);
  }

  atualizarCep(event: any) {
    this.cep = event.target.value;
  }

  buscarEnderecoPorCep() {
    // Simulação de busca de CEP e cálculo de frete técnico
    if (this.cep.length >= 8) {
      this.enderecoCliente = {
        logradouro: 'Rua Exemplo',
        bairro: 'Centro',
        localidade: 'Sorocaba',
        uf: 'SP',
        cep: this.cep
      };
      this.resultadoFrete = {
        distanciaKm: 15,
        pedagios: 0,
        custoTotal: 120.00
      };
      this.tipoFrete = 'entrega';
    }
  }

  baixarPdfOrcamento() {
    console.log('Baixando PDF do orçamento...');
    alert('Ficha técnica e orçamento gerados com sucesso!');
  }
}