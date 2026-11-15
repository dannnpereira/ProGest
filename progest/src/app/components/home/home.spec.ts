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

  it('pede o orçamento à API e mostra o total devolvido', async () => {
    await new Promise(r => setTimeout(r, 300)); // espera o debounce de 250 ms
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
    await new Promise(r => setTimeout(r, 300));
    http.expectOne('/api/orcamento').flush('<html></html>', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).querySelector('.orcamento-erro')?.textContent ?? '';
    expect(texto).toContain('Não foi possível calcular');
  });
});
