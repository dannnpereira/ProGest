import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FinanceiroService, diasEntre, somarDias } from './financeiro.service';
import { PedidosService } from './pedidos.service';
import { FormaPagamento, Lancamento, Pedido, StatusPedido } from './modelos';
import { isoDia } from './formato';

const URL = '/api/erp/financeiro/lancamentos';

const diasAtras = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
};

const pedido = (id: number, status: StatusPedido, aprovadoHaDias?: number): Pedido => ({
  id, codigo: `AM-${id}`, criadoEm: diasAtras((aprovadoHaDias ?? 0) + 1),
  aprovadoEm: aprovadoHaDias === undefined ? undefined : diasAtras(aprovadoHaDias),
  cliente: { nome: `Cliente ${id}`, tipo: 'PF', documento: '', cidade: '', uf: 'SP', telefone: '' },
  destino: '', fio: 'FIO_12', malha: 'MALHA_2', alturaM: 2, metragemM: 10, tratamento: 'GALVANIZADA',
  fioNome: '', malhaNome: '', tratamentoNome: '', rolos: '',
  frete: { tipo: 'RETIRADA', descricao: '' }, valorMaterial: 1000, valorFrete: 200, observacao: '', status,
});

const hoje = isoDia();
const lanc = (id: number, l: Partial<Lancamento>): Lancamento => ({
  id, tipo: 'COMPRA', data: hoje, categoria: null, descricao: 'Arame Fio 12', favorecido: 'Siderúrgica',
  quantidade: '3 bobinas', valor: 1000, status: 'A_PAGAR', ...l,
});

/** PedidosService de mentira: os pagamentos só mudam a lista */
class PedidosFalso {
  pedidos = signal<Pedido[]>([
    pedido(1, 'A_FAZER', 3),
    pedido(2, 'ENTREGUE', 20),
    pedido(3, 'AGUARDANDO_APROVACAO'),
    pedido(4, 'RECUSADO'),
  ]);
  registrarPagamento(id: number, data: string, forma: FormaPagamento) {
    this.pedidos.update(l => l.map(p => (p.id === id ? { ...p, pagoEm: data, formaPagamento: forma } : p)));
  }
  estornarPagamento(id: number) {
    this.pedidos.update(l => l.map(p => (p.id === id ? { ...p, pagoEm: undefined, formaPagamento: undefined } : p)));
  }
}

describe('FinanceiroService', () => {
  let svc: FinanceiroService;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: PedidosService, useClass: PedidosFalso }],
    });
    svc = TestBed.inject(FinanceiroService);
    http = TestBed.inject(HttpTestingController);

    const carga = svc.carregar();
    http.expectOne(r => r.url === URL && r.params.has('de') && r.params.has('ate')).flush([
      lanc(10, { tipo: 'COMPRA', valor: 2000, status: 'A_PAGAR' }),
      lanc(11, { tipo: 'DESPESA', categoria: 'ALUGUEL', descricao: 'Aluguel do galpão', valor: '9500' as unknown as number, status: 'PAGO' }),
      lanc(12, { tipo: 'ENTRADA', descricao: 'Venda direta', favorecido: 'PIX', valor: 5000, status: 'PAGO' }),
    ]);
    await carga;
  });

  afterEach(() => http.verify());

  it('soma e conta dias entre datas', () => {
    expect(somarDias('2026-11-20', 15)).toBe('2026-12-05');
    expect(diasEntre('2026-11-25', '2026-12-05')).toBe(10);
    expect(diasEntre('2026-12-05', '2026-11-25')).toBe(-10);
  });

  it('carrega do banco e calcula o resumo do mês', () => {
    expect(svc.estado()).toBe('ok');
    expect(svc.compras().map(c => c.id)).toEqual([10]);
    expect(svc.despesas()[0].valor).toBe(9500);
    const r = svc.resumo();
    expect(r.saidas).toBe(11500);
    expect(r.entradas).toBe(5000);
    // pedido 1 foi aprovado este mês (ou no anterior, se hoje for dia 1 a 3)
    expect(r.vendas).toBeGreaterThanOrEqual(5000);
  });

  it('só pedidos aprovados viram contas, com 15 dias de prazo', () => {
    const contas = svc.contas();
    expect(contas.map(c => c.pedidoId).sort()).toEqual([1, 2]);
    const nova = contas.find(c => c.pedidoId === 1)!;
    expect(nova.status).toBe('PENDENTE');
    expect(nova.dias).toBe(12);
    expect(nova.valor).toBe(1200);
    const antiga = contas.find(c => c.pedidoId === 2)!;
    expect(antiga.status).toBe('VENCIDO');
    expect(antiga.dias).toBe(-5);
  });

  it('pagamento move a conta para as entradas e o estorno desfaz', () => {
    const antes = svc.resumo().entradas;
    svc.registrarRecebimento(1, { data: hoje, forma: 'PIX' });
    expect(svc.contas().find(c => c.pedidoId === 1)!.status).toBe('PAGO');
    expect(svc.resumo().entradas).toBe(antes + 1200);
    expect(svc.movimentacoes().some(m => m.id === 'r:1' && m.tipo === 'ENTRADA')).toBe(true);

    expect(svc.estornarRecebimento(1)).toEqual({ data: hoje, forma: 'PIX' });
    expect(svc.contas().find(c => c.pedidoId === 1)!.status).toBe('PENDENTE');
    expect(svc.resumo().entradas).toBe(antes);
  });

  it('muda o status de uma compra e grava no banco', () => {
    const c = svc.compras()[0];
    svc.salvarCompra({ ...c, status: 'PAGO' });
    expect(svc.compras()[0].status).toBe('PAGO');
    expect(svc.movimentacoes().some(m => m.id === 'l:10')).toBe(true);

    const req = http.expectOne(`${URL}/10`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toMatchObject({ tipo: 'COMPRA', descricao: 'Arame Fio 12', favorecido: 'Siderúrgica', status: 'PAGO' });
    req.flush(lanc(10, { valor: 2000, status: 'PAGO' }));
  });

  it('registra uma saída nova e troca o id provisório pelo do banco', async () => {
    svc.salvarDespesa({
      data: hoje, categoria: 'ENERGIA', descricao: 'Energia elétrica', favorecido: 'Distribuidora', valor: 800, status: 'A_PAGAR',
    });
    expect(svc.despesas().some(d => d.id < 0 && d.descricao === 'Energia elétrica')).toBe(true);
    expect(svc.resumo().saidas).toBe(12300);

    const req = http.expectOne(r => r.url === URL && r.method === 'POST');
    expect(req.request.body).toMatchObject({ id: null, tipo: 'DESPESA', categoria: 'ENERGIA', quantidade: null });
    req.flush(lanc(99, { tipo: 'DESPESA', categoria: 'ENERGIA', descricao: 'Energia elétrica', valor: 800 }));
    await Promise.resolve();
    expect(svc.despesas().some(d => d.id === 99)).toBe(true);
  });

  it('exclui no banco e o desfazer grava de novo', () => {
    const desfazer = svc.excluirDespesa(11);
    expect(svc.despesas().length).toBe(0);
    const del = http.expectOne(`${URL}/11`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null);

    desfazer();
    expect(svc.despesas().length).toBe(1);
    const post = http.expectOne(r => r.url === URL && r.method === 'POST');
    expect(post.request.body).toMatchObject({ descricao: 'Aluguel do galpão', categoria: 'ALUGUEL' });
    post.flush(lanc(12, { tipo: 'DESPESA', categoria: 'ALUGUEL', descricao: 'Aluguel do galpão', valor: 9500 }));
  });
});
