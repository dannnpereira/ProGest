import { cpfValido, mascaraCep, mascaraCpf, mascaraTelefone, telefoneValido } from './documentos';
import { DadosPdfOrcamento, htmlOrcamento, tituloArquivo } from './orcamento-pdf';

const valores = {
  areaM2: 100, materiaPrima: 1910, acessorios: 175,
  frete: { valor: 155.6, distanciaKm: 48, combustivel: 69.6, pedagios: 36 },
  descontoPct: 10.49, desconto: 218.75, total: 2021.85, parcelas: 10, valorParcela: 224.06,
};

function dados(extra: Partial<DadosPdfOrcamento> = {}): DadosPdfOrcamento {
  return {
    numero: 'ORC-20261119-0001',
    emitidoEm: new Date(2026, 10, 19),
    validadeDias: 7,
    emitidoPor: 'Admin',
    cliente: { nome: 'Maria Silva', cpf: '52998224725', telefone: '15999990000', email: 'maria@gmail.com' },
    arame: 'Fio 12 (2,77 mm)', malha: 'Malha 3" (75 mm)', tratamento: 'Galvanizada',
    alturaM: 2, comprimentoM: 50,
    entrega: { cep: '18200-000', endereco: 'Rua A, nº 10 - Centro - Itapetininga/SP' },
    valores,
    ...extra,
  };
}

describe('documentos', () => {
  it('valida CPF igual ao cadastro do site', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('123.456.789-00')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
  });

  it('aplica as máscaras', () => {
    expect(mascaraCpf('52998224725')).toBe('529.982.247-25');
    expect(mascaraTelefone('15999990000')).toBe('(15) 99999-0000');
    expect(telefoneValido('(15) 99999-0000')).toBe(true);
    expect(mascaraCep('18200000')).toBe('18200-000');
  });
});

describe('PDF do orçamento', () => {
  it('traz cliente, entrega, validade e totais', () => {
    const html = htmlOrcamento(dados());
    expect(html).toContain('Maria Silva');
    expect(html).toContain('529.982.247-25');
    expect(html).toContain('VÁLIDO ATÉ 26/11/2026');
    expect(html).toContain('Itapetininga/SP');
    expect(html).toContain('10x de');
  });

  it('orçamento avulso sai sem dados de cliente', () => {
    const d = dados({ cliente: null, entrega: null });
    const html = htmlOrcamento(d);
    expect(html).toContain('sem cliente cadastrado');
    expect(html).toContain('Retirada na fábrica');
    expect(tituloArquivo(d)).toBe('Orcamento ORC-20261119-0001');
  });

  it('escapa o que foi digitado para não quebrar o documento', () => {
    const html = htmlOrcamento(dados({
      cliente: { nome: '<img src=x onerror=alert(1)>', cpf: '52998224725', telefone: null, email: null },
    }));
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});
