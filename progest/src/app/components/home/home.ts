import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CepService } from '../../services/cep';
import { FreteService } from '../../services/frete.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements AfterViewInit, OnDestroy {
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

  // Menu lateral (mobile)
  menuAberto = false;

  // Barra fixa de total (mobile)
  barraVisivel = false;

  @ViewChild('configSection') configSection!: ElementRef<HTMLElement>;
  @ViewChild('resumoCard') resumoCard!: ElementRef<HTMLElement>;

  private observer?: IntersectionObserver;
  private configVisivel = false;
  private resumoVisivel = false;

  // Estado da busca de CEP
  buscandoCep = false;
  erroCep = '';

  constructor(
    private cdr: ChangeDetectorRef,
    private cepService: CepService,
    private freteService: FreteService
  ) {}

  // A barra aparece quando o configurador está na tela
  // e some quando o card de resumo já está visível.
  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.configSection.nativeElement) {
          this.configVisivel = entry.isIntersecting;
        }
        if (entry.target === this.resumoCard.nativeElement) {
          this.resumoVisivel = entry.isIntersecting;
        }
      }
      this.barraVisivel = this.configVisivel && !this.resumoVisivel;
      this.cdr.detectChanges();
    });

    this.observer.observe(this.configSection.nativeElement);
    this.observer.observe(this.resumoCard.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.travarRolagem(false);
  }

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

  // Menu lateral
  abrirMenu() {
    this.menuAberto = true;
    this.travarRolagem(true);
  }

  fecharMenu() {
    this.menuAberto = false;
    this.travarRolagem(false);
  }

  @HostListener('document:keydown.escape')
  aoApertarEsc() {
    if (this.menuAberto) this.fecharMenu();
  }

  private travarRolagem(travar: boolean) {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = travar ? 'hidden' : '';
    }
  }

  // Rolagem suave
  irParaConfigurador() {
    this.fecharMenu();
    // pequena espera para a rolagem do body ser liberada antes de rolar
    setTimeout(() => {
      this.configSection.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  irParaResumo() {
    this.resumoCard.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    // Busca o endereço real no ViaCEP e calcula o frete técnico até o destino
    const cepLimpo = this.cep.replace(/\D/g, '');
    this.erroCep = '';

    if (cepLimpo.length !== 8) {
      this.erroCep = 'Digite um CEP válido com 8 números.';
      return;
    }

    this.buscandoCep = true;
    this.cepService.consultarCep(cepLimpo).subscribe({
      next: (dados) => {
        this.buscandoCep = false;

        if (!dados || dados.erro) {
          this.enderecoCliente = null;
          this.resultadoFrete = null;
          this.erroCep = 'CEP não encontrado. Confira o número digitado.';
          this.cdr.markForCheck();
          return;
        }

        // Mantém número e complemento já digitados se o cliente buscar de novo
        this.enderecoCliente = {
          logradouro: dados.logradouro,
          bairro: dados.bairro,
          localidade: dados.localidade,
          uf: dados.uf,
          cep: dados.cep,
          numero: this.enderecoCliente?.numero ?? '',
          complemento: this.enderecoCliente?.complemento || dados.complemento || ''
        };

        this.freteService.calcularFretePorCep(cepLimpo).subscribe((frete) => {
          this.resultadoFrete = frete;
          this.tipoFrete = 'entrega';
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.buscandoCep = false;
        this.erroCep = 'Não foi possível consultar o CEP agora. Tente novamente.';
        this.cdr.markForCheck();
      }
    });
  }

  baixarPdfOrcamento() {
    console.log('Baixando PDF do orçamento...');
    alert('Ficha técnica e orçamento gerados com sucesso!');
  }
}