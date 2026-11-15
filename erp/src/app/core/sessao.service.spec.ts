import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { SessaoService } from './sessao.service';
import { tokenInterceptor } from './token.interceptor';

const RESPOSTA_LOGIN = {
  token: 'abc123',
  expiraEm: new Date(Date.now() + 3_600_000).toISOString(),
  usuario: { id: 1, nome: 'Administrador', email: 'admin@amaral.com.br' },
};

describe('SessaoService', () => {
  let sessao: SessaoService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', children: [] }]),
        provideHttpClient(withInterceptors([tokenInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    sessao = TestBed.inject(SessaoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function entrar(manterConectado: boolean) {
    const promessa = sessao.entrar('admin@amaral.com.br', 'senha', manterConectado);
    http.expectOne('/api/auth/erp/login').flush(RESPOSTA_LOGIN);
    await promessa;
  }

  it('guarda a sessão só na aba quando "manter conectado" está desmarcado', async () => {
    await entrar(false);
    expect(sessao.logado()).toBe(true);
    expect(sessao.usuario()?.nome).toBe('Administrador');
    expect(sessionStorage.getItem('progest-erp-sessao')).not.toBeNull();
    expect(localStorage.getItem('progest-erp-sessao')).toBeNull();
  });

  it('guarda no localStorage quando "manter conectado" está marcado', async () => {
    await entrar(true);
    expect(localStorage.getItem('progest-erp-sessao')).not.toBeNull();
  });

  it('manda o token nas chamadas para /api/erp/', async () => {
    await entrar(false);
    firstValueFrom(TestBed.inject(HttpClient).get('/api/erp/qualquer'));
    const req = http.expectOne('/api/erp/qualquer');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc123');
    req.flush({});
  });

  it('não manda o token para outras rotas', async () => {
    await entrar(false);
    firstValueFrom(TestBed.inject(HttpClient).get('/api/pedidos'));
    const req = http.expectOne('/api/pedidos');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('sair apaga a sessão', async () => {
    await entrar(true);
    const promessa = sessao.sair();
    http.expectOne(r => r.method === 'DELETE' && r.url === '/api/erp/sessao').flush(null);
    await promessa;
    expect(sessao.logado()).toBe(false);
    expect(localStorage.getItem('progest-erp-sessao')).toBeNull();
  });
});
