import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  it('é criado', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  // ---------- Medidas do projeto: nada de valor negativo ----------

  function campos() {
    const el = fixture.nativeElement as HTMLElement;
    const [altura, comprimento] = Array.from(el.querySelectorAll<HTMLInputElement>('.input-number input, .input-counter input'));
    return { altura, comprimento };
  }

  function digitar(input: HTMLInputElement, valor: string, sair = false) {
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    if (sair) input.dispatchEvent(new Event('change'));
  }

  it('bloqueia as teclas "-", "+" e "e" nas medidas', () => {
    const tecla = (key: string) => {
      const e = new KeyboardEvent('keydown', { key, cancelable: true });
      campos().comprimento.dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(tecla('-')).toBe(true);
    expect(tecla('+')).toBe(true);
    expect(tecla('e')).toBe(true);
    expect(tecla('5')).toBe(false);
  });

  it('valor negativo colado vira positivo', () => {
    const { altura, comprimento } = campos();
    digitar(comprimento, '-30');
    expect(fixture.componentInstance.comprimentoMetros).toBe(30);
    expect(comprimento.value).toBe('30');

    digitar(altura, '-2.5');
    expect(fixture.componentInstance.alturaMetros).toBe(2.5);
  });

  it('ao sair do campo ajusta aos limites (altura 1 a 6 m, comprimento a partir de 10 m)', () => {
    const { altura, comprimento } = campos();
    const home = fixture.componentInstance;

    digitar(altura, '0', true);
    expect(home.alturaMetros).toBe(1);
    digitar(altura, '9', true);
    expect(home.alturaMetros).toBe(6);
    expect(altura.value).toBe('6');

    digitar(comprimento, '3', true);
    expect(home.comprimentoMetros).toBe(10);
    digitar(comprimento, '', true);
    expect(home.comprimentoMetros).toBe(10);
  });

  it('o botão "-" do comprimento não passa do mínimo', () => {
    const home = fixture.componentInstance;
    home.comprimentoMetros = 15;
    home.alterarComprimento(-10);
    expect(home.comprimentoMetros).toBe(10);
  });

  // ---------- Orçamento calculado pela API ----------

  const esperarDebounce = () => new Promise(r => setTimeout(r, 300)); // debounce de 250 ms

  /** Responde ao catálogo (opções vindas do ProGest) e escolhe arame, malha e tratamento */
  async function carregarCatalogoEEscolher() {
    http.expectOne('/api/catalogo').flush([
      { chave: 'FIO_12', categoria: 'ARAME', nome: 'Fio 12 (2,77 mm)', descricao: null },
      { chave: 'MALHA_3', categoria: 'MALHA', nome: 'Malha 3" (75 mm)', descricao: null },
      { chave: 'GALVANIZADA', categoria: 'TRATAMENTO', nome: 'Galvanizada', descricao: null },
    ]);
    http.expectOne('/api/catalogo/combinacoes').flush([
      { arame: 'FIO_12', malha: 'MALHA_3', tratamento: 'GALVANIZADA' },
    ]);
    await fixture.whenStable();

    const home = fixture.componentInstance;
    home.arameSelecionado = 'FIO_12';
    home.malhaSelecionada = 'MALHA_3';
    home.tratamentoSelecionado = 'GALVANIZADA';
    await esperarDebounce();
  }

  it('só pede o orçamento depois de escolher arame, malha e tratamento', async () => {
    http.expectOne('/api/catalogo').flush([]);
    http.expectOne('/api/catalogo/combinacoes').flush([]);
    await fixture.whenStable();
    await esperarDebounce();
    http.expectNone('/api/orcamento');
  });

  it('pede o orçamento à API e mostra o total devolvido', async () => {
    await carregarCatalogoEEscolher();
    const req = http.expectOne('/api/orcamento');
    expect(req.request.body).toMatchObject({ arame: 'FIO_12', malha: 'MALHA_3', tratamento: 'GALVANIZADA' });
    req.flush({
      areaM2: 100, materiaPrima: 1800, acessorios: 175, frete: { valor: 0, distanciaKm: null, combustivel: null, pedagios: null },
      descontoPct: 5, desconto: 98.75, total: 1876.25, parcelas: 10, valorParcela: 187.63,
    });
    fixture.detectChanges();
    const total = (fixture.nativeElement as HTMLElement).querySelector('.total-value')?.textContent ?? '';
    expect(total.replace(/\s/g, ' ')).toContain('1.876,25');
  });

  it('mostra aviso quando a API não responde', async () => {
    await carregarCatalogoEEscolher();
    http.expectOne('/api/orcamento').flush('<html></html>', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).querySelector('.orcamento-erro')?.textContent ?? '';
    expect(texto).toContain('Não foi possível calcular');
  });
});
