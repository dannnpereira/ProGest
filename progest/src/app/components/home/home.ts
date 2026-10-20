import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FreteService } from '../../services/frete.service';
import { CepService } from '../../services/cep';
import { PdfService } from '../../services/pdf.service';

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
  resultadoFrete: any = null;
  enderecoCliente: any = null;

  constructor(
    private freteService: FreteService,
    private cepService: CepService,
    private pdfService: PdfService
  ) {}

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

  // Método para consultar o CEP e calcular o frete automaticamente
  buscarEnderecoPorCep() {
    if (!this.cep || this.cep.length < 8) {
      alert('Por favor, digite um CEP válido.');
      return;
    }

    this.enderecoCliente = null;
    this.resultadoFrete = null;

    // 1. Consulta o ViaCEP para obter o endereço detalhado
    this.cepService.consultarCep(this.cep).subscribe({
      next: (dados: any) => {
        if (dados && !dados.erro) {
          this.enderecoCliente = dados;
          
          // 2. Calcula o frete com o Observable retornado pelo FreteService
          this.freteService.calcularFretePorCep(this.cep).subscribe(resultado => {
            this.resultadoFrete = resultado;
          });
        } else {
          alert('CEP não encontrado.');
        }
      },
      error: (err: any) => {
        console.error('Erro ao consultar CEP', err);
        alert('Erro ao consultar o CEP.');
      }
    });
  }

  // Método para disparar a geração da ficha técnica e orçamento em PDF
  baixarPdfOrcamento() {
    const dados = {
      configuracao: {
        bitola: this.bitolaSelecionada,
        malha: this.malhaSelecionada,
        tratamento: this.tratamentoSelecionado
      },
      medidas: {
        altura: this.alturaMetros,
        comprimento: this.comprimentoMetros,
        area: this.areaTotal,
        rolos: this.totalRolos
      },
      precos: {
        materiaPrima: this.valorMateriaPrima,
        acessorios: this.valorAcessorios,
        frete: this.valorFrete,
        desconto: this.valorDesconto,
        total: this.valorTotal,
        parcela: this.valorParcela
      },
      frete: this.resultadoFrete,
      endereco: this.enderecoCliente,
      tipoFrete: this.tipoFrete
    };

    this.pdfService.gerarOrcamentoPdf(dados);
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
    return this.resultadoFrete ? this.resultadoFrete.custoTotal : 0.00;
  }

  get valorDesconto(): number {
    const subtotal = this.valorMateriaPrima + this.valorAcessorios + (this.tipoFrete === 'entrega' ? this.valorFrete : 0);
    return Number((subtotal * 0.05).toFixed(2));
  }

  get valorTotal(): number {
    const freteAplicado = this.tipoFrete === 'entrega' ? this.valorFrete : 0;
    const subtotal = this.valorMateriaPrima + this.valorAcessorios + freteAplicado;
    return Number((subtotal - this.valorDesconto).toFixed(2));
  }

  get valorParcela(): number {
    return Number((this.valorTotal / 10).toFixed(2));
  }
}