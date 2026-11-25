import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FinanceiroService, diasEntre, somarDias } from './financeiro.service';
import { PedidosService } from './pedidos.service';
import { Pedido, StatusPedido } from './modelos';
import { isoDia } from './formato';

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

describe('FinanceiroService', () => {
  let svc: FinanceiroService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [{
        provide: PedidosService,
        useValue: {
          pedidos: signal<Pedido[]>([
            pedido(1, 'A_FAZER', 3),
            pedido(2, 'ENTREGUE', 20),
            pedido(3, 'AGUARDANDO_APROVACAO'),
            pedido(4, 'RECUSADO'),
          ]),
        },
      }],
    });
    svc = TestBed.inject(FinanceiroService);
  });

  it('soma e conta dias entre datas', () => {
    expect(somarDias('2026-11-20', 15)).toBe('2026-12-05');
    expect(diasEntre('2026-11-25', '2026-12-05')).toBe(10);
    expect(diasEntre('2026-12-05', '2026-11-25')).toBe(-10);
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
    svc.registrarRecebimento(1, { data: isoDia(), forma: 'PIX' });

    expect(svc.contas().find(c => c.pedidoId === 1)!.status).toBe('PAGO');
    expect(svc.resumo().entradas).toBe(antes + 1200);
    expect(svc.movimentacoes().some(m => m.id === 'r:1' && m.tipo === 'ENTRADA')).toBe(true);

    svc.estornarRecebimento(1);
    expect(svc.contas().find(c => c.pedidoId === 1)!.status).toBe('PENDENTE');
    expect(svc.resumo().entradas).toBe(antes);
  });

  it('gera saídas de exemplo (salários, aluguel, energia, IPVA...)', () => {
    const cats = new Set(svc.despesas().map(d => d.categoria));
    for (const c of ['SALARIOS', 'ALUGUEL', 'ENERGIA', 'VEICULOS', 'IMPOSTOS'] as const) expect(cats.has(c)).toBe(true);
  });

  it('edita o status de uma compra de exemplo e recalcula as saídas', () => {
    const c = svc.compras().find(x => x.status !== 'PAGO')!;
    const saidas = svc.resumo().saidas;
    expect(svc.movimentacoes().some(m => m.id === c.id)).toBe(false);

    svc.salvarCompra({ ...c, status: 'PAGO', valor: c.valor + 100 });
    expect(svc.compras().find(x => x.id === c.id)!.status).toBe('PAGO');
    expect(svc.resumo().saidas).toBe(saidas + 100);
    expect(svc.movimentacoes().some(m => m.id === c.id)).toBe(true);
  });

  it('exclui uma despesa e desfaz a exclusão', () => {
    const d = svc.despesas()[0];
    const saidas = svc.resumo().saidas;
    const desfazer = svc.excluirDespesa(d.id);
    expect(svc.despesas().some(x => x.id === d.id)).toBe(false);
    expect(svc.resumo().saidas).toBe(saidas - d.valor);
    desfazer();
    expect(svc.despesas().some(x => x.id === d.id)).toBe(true);
  });

  it('registra uma saída nova no mês', () => {
    const saidas = svc.resumo().saidas;
    svc.salvarDespesa({
      data: `${svc.mes()}-01`, categoria: 'OUTROS', descricao: 'Material de escritório',
      favorecido: 'Papelaria', valor: 150, status: 'A_PAGAR',
    });
    expect(svc.despesas().some(d => d.descricao === 'Material de escritório')).toBe(true);
    expect(svc.resumo().saidas).toBe(saidas + 150);
  });
});
