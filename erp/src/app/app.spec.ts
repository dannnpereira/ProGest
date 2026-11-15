import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';
import { Layout } from './layout/layout';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, Layout],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('cria a raiz do ERP', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('o layout mostra o menu com as telas do ERP', async () => {
    const fixture = TestBed.createComponent(Layout);
    await fixture.whenStable();
    const texto = (fixture.nativeElement as HTMLElement).querySelector('nav')?.textContent ?? '';
    expect(texto).toContain('Aprovação de Pedidos');
    expect(texto).toContain('Produtos e Valores');
    expect(texto).toContain('Financeiro');
  });
});
