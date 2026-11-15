import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';
import { Layout } from './layout/layout';

function logarComo(perfil: 'ADMIN' | 'FUNCIONARIO') {
  sessionStorage.setItem('progest-erp-sessao', JSON.stringify({
    token: 't', expiraEm: new Date(Date.now() + 3_600_000).toISOString(),
    usuario: { id: 1, nome: 'Teste', email: 'teste@exemplo.com', perfil },
  }));
}

async function textoDoMenu(): Promise<string> {
  await TestBed.configureTestingModule({
    imports: [App, Layout],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  const fixture = TestBed.createComponent(Layout);
  await fixture.whenStable();
  return (fixture.nativeElement as HTMLElement).querySelector('nav')?.textContent ?? '';
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('cria a raiz do ERP', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('administrador vê todas as telas no menu', async () => {
    logarComo('ADMIN');
    const texto = await textoDoMenu();
    expect(texto).toContain('Aprovação de Pedidos');
    expect(texto).toContain('Produção e Entregas');
    expect(texto).toContain('Produtos e Valores');
    expect(texto).toContain('Financeiro');
  });

  it('funcionário só vê Produção e Entregas', async () => {
    logarComo('FUNCIONARIO');
    const texto = await textoDoMenu();
    expect(texto).toContain('Produção e Entregas');
    expect(texto).not.toContain('Aprovação');
    expect(texto).not.toContain('Produtos');
    expect(texto).not.toContain('Financeiro');
    expect(texto).not.toContain('Configurações');
  });
});
