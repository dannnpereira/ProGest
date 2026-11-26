import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ClienteErp, ClientesService, mensagemDeErro } from './clientes.service';

const MARIA: ClienteErp = {
  id: 7, nome: 'Maria Teste', cpf: '52998224725', email: 'maria@gmail.com', telefone: '15999990000', temConta: true,
};

describe('ClientesService', () => {
  let svc: ClientesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(ClientesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('busca pelo CPF mandando só os dígitos no corpo (não na URL)', async () => {
    const busca = svc.buscarPorCpf('529.982.247-25');
    const req = http.expectOne('/api/erp/clientes/busca');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ cpf: '52998224725' });
    req.flush(MARIA);
    expect(await busca).toEqual(MARIA);
  });

  it('CPF sem cadastro (404) devolve null', async () => {
    const busca = svc.buscarPorCpf('111.444.777-35');
    http.expectOne('/api/erp/clientes/busca').flush({ message: 'Nenhum cliente' }, { status: 404, statusText: 'Not Found' });
    expect(await busca).toBeNull();
  });

  it('outros erros na busca continuam sendo erro', async () => {
    const busca = svc.buscarPorCpf('123.456.789-00');
    http.expectOne('/api/erp/clientes/busca').flush({ message: 'CPF inválido.' }, { status: 400, statusText: 'Bad Request' });
    await expect(busca).rejects.toBeInstanceOf(HttpErrorResponse);
  });

  it('cria a conta com nome e e-mail sem espaços e CPF só com dígitos', async () => {
    const criar = svc.cadastrar({
      nome: '  Maria Teste ', cpf: '529.982.247-25', telefone: '(15) 99999-0000',
      email: ' maria@gmail.com ', senha: 'senha-forte-1',
    });
    const req = http.expectOne('/api/erp/clientes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nome: 'Maria Teste', cpf: '52998224725', telefone: '(15) 99999-0000',
      email: 'maria@gmail.com', senha: 'senha-forte-1',
    });
    req.flush(MARIA);
    expect((await criar).temConta).toBe(true);
  });

  it('gera o link de nova senha do cliente', async () => {
    const gerar = svc.gerarLinkSenha(7);
    const req = http.expectOne('/api/erp/clientes/7/link-senha');
    expect(req.request.method).toBe('POST');
    const resposta = { link: 'https://site/redefinir-senha?token=abc', expiraEm: '2026-11-27T20:00:00Z' };
    req.flush(resposta);
    expect(await gerar).toEqual(resposta);
  });
});

describe('mensagemDeErro', () => {
  const erro = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

  it('usa a mensagem do servidor quando existe', () => {
    expect(mensagemDeErro(erro(409, { message: 'Este CPF já tem conta.' }), 'padrão')).toBe('Este CPF já tem conta.');
  });

  it('avisa quando não há conexão', () => {
    expect(mensagemDeErro(erro(0), 'padrão')).toContain('Sem conexão');
  });

  it('cai na mensagem padrão nos outros casos', () => {
    expect(mensagemDeErro(erro(500), 'padrão')).toBe('padrão');
    expect(mensagemDeErro(new Error('x'), 'padrão')).toBe('padrão');
  });
});
