import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  linkedSignal,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, map, of, switchMap, tap } from 'rxjs';
import { CepService } from '../../services/cep';
import { Orcamento, OrcamentoService, PedidoOrcamento } from '../../services/orcamento.service';
import { AuthService } from '../../services/auth.service';
import { ContaService } from '../../services/conta.service';
import { PdfService } from '../../services/pdf.service';
import { CatalogoService, ItemCatalogo } from '../../services/catalogo.service';
import { Router } from '@angular/router';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
/** Configuração guardada ao ir para o login, para o cliente não refazer tudo */
const CHAVE_RASCUNHO = 'progest_rascunho_orcamento';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  // Opções de arame, malha e tratamento: cadastradas no ProGest (GET /api/catalogo)
  protected readonly catalogo = inject(CatalogoService);

  // Escolhas do configurador (chave do produto). Guardadas em signals para o orçamento
  // ser pedido de novo à API sempre que alguma muda. O site abre sem nada escolhido:
  // o preço só aparece depois de o cliente escolher arame, malha e tipo. Se a opção
  // escolhida deixar de existir (ex.: trocou o arame), ela volta a ficar em branco.
  // Malhas e tratamentos seguem a tabela de preços: só as combinações que existem
  // (ex.: Fio 16 só tem malha 3/4" e 1"); ao trocar o arame, a malha se ajusta.
  protected readonly malhas = computed(() => this.catalogo.malhasDo(this.sArame()));
  protected readonly tratamentos = computed(() => this.catalogo.tratamentosDe(this.sArame(), this.sMalha()));

  private sArame = linkedSignal<ItemCatalogo[], string>({
    source: () => this.catalogo.arames(),
    computation: (lista, antes) => manterOuVazio(lista, antes?.value),
  });
  private sMalha = linkedSignal<ItemCatalogo[], string>({
    source: () => this.malhas(),
    computation: (lista, antes) => manterOuVazio(lista, antes?.value),
  });
  private sTratamento = linkedSignal<ItemCatalogo[], string>({
    source: () => this.tratamentos(),
    computation: (lista, antes) => manterOuVazio(lista, antes?.value),
  });
  private sAltura = signal(2.0);
  private sComprimento = signal(50);
  private sTipoFrete = signal<'entrega' | 'retirada'>('retirada');
  /** CEP usado no frete (só depois de "Calcular por CEP" dar certo) */
  private cepFrete = signal<string | null>(null);

  get arameSelecionado() { return this.sArame(); }
  set arameSelecionado(v: string) { this.sArame.set(v); }
  get malhaSelecionada() { return this.sMalha(); }
  set malhaSelecionada(v: string) { this.sMalha.set(v); }
  get alturaMetros() { return this.sAltura(); }
  set alturaMetros(v: number) { this.sAltura.set(v); }
  get comprimentoMetros() { return this.sComprimento(); }
  set comprimentoMetros(v: number) { this.sComprimento.set(v); }
  get tratamentoSelecionado() { return this.sTratamento(); }
  set tratamentoSelecionado(v: string) { this.sTratamento.set(v); }
  get tipoFrete() { return this.sTipoFrete(); }

  /** Ainda falta escolher arame, malha ou tipo (sem isso não há preço) */
  readonly faltaEscolher = computed(() => !this.sArame() || !this.sMalha() || !this.sTratamento());

  textoFaltaEscolher(): string {
    if (!this.sArame()) return 'Escolha o arame (passo 01) para ver o preço.';
    if (!this.sMalha()) return 'Escolha a malha (passo 02) para ver o preço.';
    return 'Escolha o tratamento (passo 04) para ver o preço.';
  }
  set tipoFrete(v: 'entrega' | 'retirada') { this.sTipoFrete.set(v); }

  cep: string = '';
  enderecoCliente: any = null;

  // ---------- Orçamento (calculado pela API) ----------
  private pedido = computed<PedidoOrcamento>(() => ({
    arame: this.sArame(),
    malha: this.sMalha(),
    tratamento: this.sTratamento(),
    alturaM: this.sAltura(),
    comprimentoM: this.sComprimento(),
    entrega: this.sTipoFrete() === 'entrega',
    cep: this.cepFrete(),
  }));

  readonly orcamento = signal<Orcamento | null>(null);
  readonly calculando = signal(true);
  /** Mensagem quando a API não conseguiu calcular (servidor fora, opção indisponível...) */
  readonly erroOrcamento = signal('');

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

  // ---------- Pedido ----------
  readonly enviandoPedido = signal(false);
  readonly erroPedido = signal('');
  /** Veio do login com uma configuração guardada: rola até o resumo */
  private voltouDoLogin = false;

  get primeiroNome(): string {
    return this.auth.usuarioAtual()?.nome?.split(' ')[0] ?? '';
  }

  constructor(
    private cdr: ChangeDetectorRef,
    private cepService: CepService,
    private orcamentoService: OrcamentoService,
    protected auth: AuthService,
    private conta: ContaService,
    private pdf: PdfService,
    private router: Router
  ) {
    this.catalogo.carregar();
    this.voltouDoLogin = this.restaurarRascunho();

    // Pede o orçamento à API quando as escolhas mudam (espera 250 ms de calmaria
    // para não mandar uma requisição a cada tecla; uma resposta antiga é descartada).
    toObservable(this.pedido).pipe(
      tap(() => this.calculando.set(true)),
      debounceTime(250),
      // Sem as três escolhas (ou sem catálogo) não há o que orçar
      switchMap(pedido => !pedido.arame || !pedido.malha || !pedido.tratamento
        ? of({ orcamento: null, erro: '' })
        : this.orcamentoService.calcular(pedido).pipe(
        map(orcamento => ({ orcamento, erro: '' })),
        catchError((e: HttpErrorResponse) => of({ orcamento: null, erro: this.mensagemDeErro(e) })),
      )),
      takeUntilDestroyed(),
    ).subscribe(({ orcamento, erro }) => {
      this.orcamento.set(orcamento);
      this.erroOrcamento.set(erro);
      this.calculando.set(!orcamento && !erro && !this.faltaEscolher());
    });
  }

  private mensagemDeErro(e: HttpErrorResponse): string {
    const doServidor = typeof e.error?.message === 'string' ? e.error.message : '';
    // Só confia no status se a resposta veio do backend (Spring manda "timestamp")
    const doBackend = !!e.error?.timestamp;
    if (doBackend && e.status === 400) return 'Confira a altura e o comprimento informados.';
    if (doBackend && e.status === 422 && doServidor) return doServidor;
    return 'Não foi possível calcular o orçamento agora. Tente novamente em instantes.';
  }

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

    if (this.voltouDoLogin) {
      setTimeout(() => this.resumoCard.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }

  // ---------- Fazer pedido / login ----------

  /** Sem login: guarda a configuração e vai para o login; depois volta para cá. */
  irParaLogin(): void {
    this.guardarRascunho();
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/' } });
  }

  sair(): void {
    this.auth.sair();
    this.fecharMenu();
  }

  fazerPedido(): void {
    if (this.enviandoPedido()) return;
    this.erroPedido.set('');

    const entrega = this.tipoFrete === 'entrega';
    const end = this.enderecoCliente;
    if (entrega && (!this.cepFrete() || !end)) {
      this.erroPedido.set('Para entrega, informe o CEP da obra e clique em "Calcular por CEP" (passo 05).');
      return;
    }
    if (entrega && !String(end.numero ?? '').trim()) {
      this.erroPedido.set('Informe o número do endereço de entrega (passo 05).');
      return;
    }
    if (!this.orcamento()) {
      this.erroPedido.set(this.faltaEscolher() ? this.textoFaltaEscolher() : 'Aguarde o orçamento ser calculado para fazer o pedido.');
      return;
    }

    const p = this.pedido();
    this.enviandoPedido.set(true);
    this.conta.fazerPedido({
      arame: p.arame, malha: p.malha, tratamento: p.tratamento,
      alturaM: p.alturaM, comprimentoM: p.comprimentoM, entrega,
      endereco: entrega ? {
        cep: end.cep, logradouro: end.logradouro || 'Endereço sem logradouro', numero: String(end.numero).trim(),
        complemento: end.complemento ?? '', bairro: end.bairro ?? '', cidade: end.localidade, uf: end.uf,
      } : null,
    }).subscribe({
      next: criado => {
        this.enviandoPedido.set(false);
        this.apagarRascunho();
        this.router.navigate(['/acompanhar'], { queryParams: { pedido: criado.codigo } });
      },
      error: (e: HttpErrorResponse) => {
        this.enviandoPedido.set(false);
        // 401: o interceptor já leva para o login. Guarda a configuração para não perder.
        if (e.status === 401) {
          this.guardarRascunho();
          return;
        }
        const msg = typeof e.error?.message === 'string' && e.error?.timestamp ? e.error.message : '';
        this.erroPedido.set(
          e.status === 422 && msg ? msg
            : e.status === 400 ? (msg && !msg.startsWith('Validation') ? msg : 'Confira as medidas e o endereço de entrega.')
            : 'Não foi possível enviar o pedido agora. Tente novamente em instantes.');
      },
    });
  }

  private guardarRascunho(): void {
    try {
      sessionStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({
        arame: this.arameSelecionado, malha: this.malhaSelecionada, altura: this.alturaMetros,
        comprimento: this.comprimentoMetros, tratamento: this.tratamentoSelecionado,
        tipoFrete: this.tipoFrete, cep: this.cep, cepFrete: this.cepFrete(), endereco: this.enderecoCliente,
      }));
    } catch {
      // sem armazenamento: a configuração volta ao padrão
    }
  }

  /** Recupera a configuração feita antes do login. Devolve true se havia uma. */
  private restaurarRascunho(): boolean {
    try {
      const bruto = sessionStorage.getItem(CHAVE_RASCUNHO);
      if (!bruto) return false;
      const r = JSON.parse(bruto);
      // Chaves dos produtos: se alguma não existir mais, o catálogo troca pela primeira opção
      if (typeof r.arame === 'string') this.sArame.set(r.arame);
      if (typeof r.malha === 'string') this.sMalha.set(r.malha);
      this.sAltura.set(Number(r.altura) || 2);
      this.sComprimento.set(Number(r.comprimento) || 50);
      if (typeof r.tratamento === 'string') this.sTratamento.set(r.tratamento);
      this.sTipoFrete.set(r.tipoFrete === 'entrega' ? 'entrega' : 'retirada');
      this.cep = r.cep ?? '';
      this.cepFrete.set(r.cepFrete ?? null);
      this.enderecoCliente = r.endereco ?? null;
      return true;
    } catch {
      return false;
    }
  }

  private apagarRascunho(): void {
    try {
      sessionStorage.removeItem(CHAVE_RASCUNHO);
    } catch {
      // nada a fazer
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.travarRolagem(false);
  }

  // Medidas (não envolvem preço)
  get areaTotal(): number {
    return this.alturaMetros * this.comprimentoMetros;
  }

  get totalRolos(): number {
    return Math.ceil(this.comprimentoMetros / 15);
  }

  // Valores do resumo: todos vêm da resposta da API (null enquanto não há orçamento)
  get valorMateriaPrima() { return this.orcamento()?.materiaPrima ?? null; }
  get valorAcessorios() { return this.orcamento()?.acessorios ?? null; }
  get valorFrete() { return this.orcamento()?.frete.valor ?? null; }
  get valorDesconto() { return this.orcamento()?.desconto ?? null; }
  get valorTotal() { return this.orcamento()?.total ?? null; }
  get valorParcela() { return this.orcamento()?.valorParcela ?? null; }
  get parcelasMax() { return this.orcamento()?.parcelas ?? null; }

  get descontoTexto(): string {
    const pct = this.orcamento()?.descontoPct;
    return pct == null ? '—' : pct.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }

  /** Detalhe do frete por CEP (mesmo formato que o template já usava) */
  get resultadoFrete() {
    const f = this.orcamento()?.frete;
    return f && f.distanciaKm != null
      ? { custoTotal: f.valor, distanciaKm: f.distanciaKm, pedagios: f.pedagios }
      : null;
  }

  /** R$ 1.234,56, ou "—" quando ainda não há valor */
  reais(v: number | null): string {
    return v == null ? '—' : BRL.format(v);
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
          this.cepFrete.set(null);
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

        // O frete é calculado pela API junto com o orçamento
        this.cepFrete.set(cepLimpo);
        this.tipoFrete = 'entrega';
        this.cdr.markForCheck();
      },
      error: () => {
        this.buscandoCep = false;
        this.erroCep = 'Não foi possível consultar o CEP agora. Tente novamente.';
        this.cdr.markForCheck();
      }
    });
  }

  /** Abre a ficha técnica + orçamento pronta para imprimir / salvar em PDF. */
  baixarPdfOrcamento() {
    const o = this.orcamento();
    if (!o) {
      this.erroPedido.set(this.faltaEscolher() ? this.textoFaltaEscolher() : 'Aguarde o orçamento ser calculado para gerar a ficha técnica.');
      return;
    }
    this.erroPedido.set('');
    const ok = this.pdf.gerarOrcamentoPdf({
      configuracao: {
        arame: this.catalogo.nome(this.arameSelecionado),
        malha: this.catalogo.nome(this.malhaSelecionada),
        tratamento: this.catalogo.nome(this.tratamentoSelecionado),
      },
      medidas: {
        altura: this.alturaMetros, comprimento: this.comprimentoMetros,
        area: Number(o.areaM2), rolos: this.totalRolos,
      },
      tipoFrete: this.tipoFrete,
      endereco: this.tipoFrete === 'entrega' ? this.enderecoCliente : null,
      orcamento: o,
      cliente: this.auth.usuarioAtual()?.nome ?? null,
    });
    if (!ok) {
      this.erroPedido.set('O navegador bloqueou a janela da ficha técnica. Permita pop-ups para este site e tente de novo.');
    }
  }
}

/** Mantém a opção escolhida se ela ainda existe; senão, fica sem escolha. */
function manterOuVazio(lista: ItemCatalogo[], escolhida: string | undefined): string {
  return escolhida && lista.some(i => i.chave === escolhida) ? escolhida : '';
}
