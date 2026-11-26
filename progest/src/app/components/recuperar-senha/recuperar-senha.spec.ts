import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { RecuperarSenhaComponent, forcaDaSenha } from './recuperar-senha';
import { AuthService } from '../../services/auth.service';

describe('RecuperarSenhaComponent', () => {
  let fixture: ComponentFixture<RecuperarSenhaComponent>;
  let http: HttpTestingController;
  let el: HTMLElement;

  /** Abre a tela; com token = veio do link do e-mail */
  async function abrir(token?: string) {
    await TestBed.configureTestingModule({
      imports: [RecuperarSenhaComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } },
        },
      ],
    }).compileComponents();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(RecuperarSenhaComponent);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    return router;
  }

  function digitar(seletor: string, valor: string) {
    const input = el.querySelector<HTMLInputElement>(seletor)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function enviar() {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  const titulo = () => el.querySelector('h2')?.textContent?.trim();

  afterEach(() => http.verify());

  // ---------- Pedir o link ----------

  it('sem token, abre pedindo o e-mail', async () => {
    await abrir();
    expect(titulo()).toBe('Esqueceu a senha?');
  });

  it('e-mail inválido mostra o erro e não chama a API', async () => {
    await abrir();
    digitar('#rs-email', 'maria@gmail');
    enviar();
    expect(el.querySelector('.error')?.textContent).toContain('e-mail válido');
    http.expectNone('/api/auth/esqueci-senha');
  });

  it('envia o e-mail sem espaços e mostra a confirmação com o e-mail escondido', async () => {
    await abrir();
    digitar('#rs-email', '  maria.teste@gmail.com ');
    enviar();

    const req = http.expectOne('/api/auth/esqueci-senha');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'maria.teste@gmail.com' });
    req.flush(null, { status: 202, statusText: 'Accepted' });
    fixture.detectChanges();

    expect(titulo()).toBe('Verifique seu e-mail');
    expect(el.textContent).toContain('ma***@gmail.com');
    expect(el.textContent).not.toContain('maria.teste@gmail.com');
  });

  it('sem conexão avisa e continua no formulário', async () => {
    await abrir();
    digitar('#rs-email', 'maria@gmail.com');
    enviar();
    http.expectOne('/api/auth/esqueci-senha').error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();

    expect(titulo()).toBe('Esqueceu a senha?');
    expect(el.querySelector('.form-error')?.textContent).toContain('Sem conexão');
  });

  // ---------- Link do e-mail ----------

  it('tira o token do endereço e confere o link', async () => {
    const router = await abrir('tok-123');
    expect(router.navigate).toHaveBeenCalledWith([], { queryParams: {}, replaceUrl: true });

    const req = http.expectOne('/api/auth/redefinir-senha/validar');
    expect(req.request.body).toEqual({ token: 'tok-123' });
    expect(titulo()).toBe('Conferindo o link…');

    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();
    expect(titulo()).toBe('Crie uma nova senha');
  });

  it('link usado ou vencido mostra a opção de pedir outro', async () => {
    await abrir('tok-velho');
    http.expectOne('/api/auth/redefinir-senha/validar')
      .flush({ message: 'não vale mais' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(titulo()).toBe('Este link não vale mais');
    el.querySelector<HTMLButtonElement>('.btn-primary')!.click();
    fixture.detectChanges();
    expect(titulo()).toBe('Esqueceu a senha?');
  });

  async function abrirFormulario() {
    await abrir('tok-123');
    http.expectOne('/api/auth/redefinir-senha/validar').flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();
  }

  it('não envia senha curta nem senhas diferentes', async () => {
    await abrirFormulario();

    digitar('#rs-senha', 'curta');
    digitar('#rs-confirma', 'curta');
    enviar();
    expect(el.textContent).toContain('de 8 a 72 caracteres');

    digitar('#rs-senha', 'senha-nova-123');
    digitar('#rs-confirma', 'senha-nova-124');
    enviar();
    expect(el.textContent).toContain('As senhas não são iguais');

    http.expectNone('/api/auth/redefinir-senha');
  });

  it('salva a senha nova, encerra a sessão local e mostra a confirmação', async () => {
    await abrirFormulario();
    const limpar = vi.spyOn(TestBed.inject(AuthService), 'limpar');

    digitar('#rs-senha', 'senha-nova-123');
    digitar('#rs-confirma', 'senha-nova-123');
    enviar();

    const req = http.expectOne('/api/auth/redefinir-senha');
    expect(req.request.body).toEqual({ token: 'tok-123', senha: 'senha-nova-123' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(titulo()).toBe('Senha alterada');
    expect(limpar).toHaveBeenCalled();
    expect(el.querySelector('a.btn-primary')?.getAttribute('href')).toBe('/login');
  });

  it('link que venceu com a tela aberta leva para "pedir outro"', async () => {
    await abrirFormulario();
    digitar('#rs-senha', 'senha-nova-123');
    digitar('#rs-confirma', 'senha-nova-123');
    enviar();
    http.expectOne('/api/auth/redefinir-senha').flush({}, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(titulo()).toBe('Este link não vale mais');
  });
});

describe('forcaDaSenha', () => {
  it('classifica pelo tamanho e pela variedade de caracteres', () => {
    expect(forcaDaSenha('abc')).toBe(0);
    expect(forcaDaSenha('abcdefgh')).toBe(1);
    expect(forcaDaSenha('abcdefghij')).toBe(2);
    expect(forcaDaSenha('Abcdef12')).toBe(2);
    expect(forcaDaSenha('Abcdefgh1234!')).toBe(3);
  });
});
