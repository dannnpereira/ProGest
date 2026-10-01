import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FreteService } from '../../services/frete.service';
import { CepService } from '../../services/cep'; // <-- Ajustado para './cep'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})

export class HomeComponent {
  // Variáveis de Seleção do Configurador
  bitolaSelecionada: string = 'fio12';
  malhaSelecionada: string = 'malha2';
  tratamentoSelecionado: string = 'galvanizado';
  tipoFrete: string = 'entrega';

  // Dimensões do Projeto
  alturaMetros: number = 2.0;
  comprimentoMetros: number = 40;

  // Localização e Frete Dinâmico
  cep: string = '';
  distanciaInput: number = 45;
  resultadoFrete: any;

  constructor(
    private freteService: FreteService,
    private cepService: CepService
  ) {
    this.atualizarCalculoFrete();
  }

  // Métodos de manipulação de medidas
  atualizarAltura(event: any) {
    this.alturaMetros = Number(event.target.value) || 0;
  }

  atualizarComprimentoInput(event: any) {
    this.comprimentoMetros = Number(event.target.value) || 0;
  }

  alterarComprimento(valor: number) {
    this.comprimentoMetros = Math.max(10, this.comprimentoMetros + valor);
  }

  atualizarCep(event: any) {
    this.cep = event.target.value;
  }

  atualizarCalculoFrete() {
    this.resultadoFrete = this.freteService.calcularFreteComDistancia(this.distanciaInput);
  }

  // Método para consultar o CEP e atualizar a distância automaticamente
  buscarEnderecoPorCep() {
    if (!this.cep || this.cep.length < 8) {
      alert('Por favor, digite um CEP válido.');
      return;
    }

    // 1. Consulta o ViaCEP para obter o endereço detalhado
    this.cepService.consultarCep(this.cep).subscribe({
      next: (dados: any) => {
        if (dados && !dados.erro) {
          const enderecoCompleto = `${dados.logradouro || ''}, ${dados.bairro || ''}, ${dados.localidade} - ${dados.uf}`;
          
          // 2. Aciona o Google Maps Distance Matrix através do serviço de frete
          this.freteService.calcularDistanciaGoogleMaps(enderecoCompleto).subscribe({
            next: (distanciaKmReal) => {
              this.distanciaInput = distanciaKmReal;
              this.atualizarCalculoFrete();
              
              alert(`Endereço: ${enderecoCompleto}\nDistância calculada: ${distanciaKmReal} Km\nFrete técnico atualizado com sucesso!`);
            },
            error: (err) => {
              console.error('Erro na integração com Google Maps:', err);
              this.atualizarCalculoFrete();
            }
          });

        } else {
          alert('CEP não encontrado.');
        }
      },
      error: (err: any) => {
        console.log('Erro ao buscar CEP', err);
        alert('Erro ao consultar o CEP.');
      }
    });
  }

  // Getters para cálculos reativos do orçamento
  get areaTotal(): number {
    return this.alturaMetros * this.comprimentoMetros;
  }

  get totalRolos(): number {
    return Math.ceil(this.comprimentoMetros / 15);
  }

  get valorMateriaPrima(): number {
    let base = this.comprimentoMetros * this.alturaMetros * 45;
    if (this.bitolaSelecionada === 'fio12') base *= 1.15;
    return Number(base.toFixed(2));
  }

  get valorAcessorios(): number {
    return Number((this.comprimentoMetros * 8.5).toFixed(2));
  }

  get valorFrete(): number {
    return this.resultadoFrete ? this.resultadoFrete.custoTotal : 180.00;
  }

  get valorDesconto(): number {
    const subtotal = this.valorMateriaPrima + this.valorAcessorios + this.valorFrete;
    return Number((subtotal * 0.05).toFixed(2));
  }

  get valorTotal(): number {
    const subtotal = this.valorMateriaPrima + this.valorAcessorios + this.valorFrete;
    return Number((subtotal - this.valorDesconto).toFixed(2));
  }

  get valorParcela(): number {
    return Number((this.valorTotal / 10).toFixed(2));
  }
}