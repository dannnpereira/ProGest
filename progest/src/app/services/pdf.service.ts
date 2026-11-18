import { Injectable } from '@angular/core';
import { Orcamento } from './orcamento.service';

export interface DadosFichaTecnica {
  /** Nomes dos produtos escolhidos (cadastrados no ProGest) */
  configuracao: { arame: string; malha: string; tratamento: string };
  medidas: { altura: number; comprimento: number; area: number; rolos: number };
  tipoFrete: 'entrega' | 'retirada';
  endereco: { logradouro?: string; numero?: string; complemento?: string; bairro?: string; localidade?: string; uf?: string; cep?: string } | null;
  /** Valores calculados pela API (mesmos do resumo na tela) */
  orcamento: Orcamento;
  cliente: string | null;
  /** Endereço já montado (ficha de um pedido gravado) */
  enderecoTexto?: string;
  /** Código do pedido, quando a ficha é de um pedido feito */
  codigoPedido?: string;
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NUM = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

/** Evita que texto digitado pelo cliente (endereço) vire HTML na ficha */
function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/**
 * Ficha técnica + orçamento: abre uma janela com o documento e chama a impressão,
 * onde o cliente escolhe "Salvar como PDF". Devolve false se o navegador bloquear a janela.
 */
@Injectable({ providedIn: 'root' })
export class PdfService {

  gerarOrcamentoPdf(d: DadosFichaTecnica): boolean {
    const janela = window.open('', '_blank');
    if (!janela) return false;

    const o = d.orcamento;
    const entrega = d.tipoFrete === 'entrega';
    const e = d.endereco;
    const enderecoTexto = d.enderecoTexto ? esc(d.enderecoTexto) : e
      ? `${esc(e.logradouro)}${e.numero ? ', nº ' + esc(e.numero) : ''}${e.complemento ? ' (' + esc(e.complemento) + ')' : ''}` +
        `${e.bairro ? ' - ' + esc(e.bairro) : ''} - ${esc(e.localidade)}/${esc(e.uf)} (CEP ${esc(e.cep)})`
      : '';
    const hoje = new Date();
    const validade = new Date(hoje.getTime() + 7 * 86_400_000);

    janela.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ficha técnica e orçamento - Amaral Alambrados</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; margin: 0; padding: 24px; background: #fff; }
    .header { border-bottom: 3px solid #111827; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
    .logo { display: inline-block; background: #111827; color: #fff; font-size: 20px; font-weight: 800; letter-spacing: 1px; padding: 6px 12px; }
    .sub { margin: 6px 0 0; font-size: 13px; color: #6b7280; }
    .badge { background: #fef3c7; color: #92400e; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 4px; letter-spacing: .5px; }
    .meta { margin: 6px 0 0; font-size: 12px; text-align: right; color: #6b7280; }
    h2 { font-size: 15px; letter-spacing: .5px; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin: 24px 0 10px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d1d5db; padding: 9px 10px; text-align: left; font-size: 13px; }
    th { background: #f3f4f6; color: #374151; width: 38%; }
    td.valor, th.valor { text-align: right; white-space: nowrap; }
    .desconto td { color: #047857; font-weight: 700; }
    .total { margin-top: 18px; background: #111827; color: #fff; padding: 16px 18px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .total strong { font-size: 24px; color: #fbbf24; }
    .total small { display: block; font-size: 12px; color: #d1d5db; margin-top: 4px; }
    .nota { font-size: 12px; color: #4b5563; margin-top: 10px; }
    .footer { margin-top: 32px; font-size: 11px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <span class="logo">AMARAL ALAMBRADOS</span>
      <p class="sub">Ficha técnica e orçamento${d.codigoPedido ? " • Pedido " + esc(d.codigoPedido) : ""}${d.cliente ? ' • Cliente: ' + esc(d.cliente) : ''}</p>
    </div>
    <div>
      <span class="badge">VÁLIDO ATÉ ${validade.toLocaleDateString('pt-BR')}</span>
      <p class="meta">Emitido em ${hoje.toLocaleDateString('pt-BR')}</p>
    </div>
  </div>

  <h2>01. Especificação técnica</h2>
  <table>
    <tr><th>Bitola do arame</th><td>${esc(d.configuracao.arame)}</td></tr>
    <tr><th>Malha / abertura</th><td>${esc(d.configuracao.malha)}</td></tr>
    <tr><th>Tratamento anticorrosivo</th><td>${esc(d.configuracao.tratamento)}</td></tr>
    <tr><th>Altura da tela</th><td>${NUM.format(d.medidas.altura)} m</td></tr>
    <tr><th>Comprimento (metragem linear)</th><td>${NUM.format(d.medidas.comprimento)} m</td></tr>
    <tr><th>Área total de tela</th><td>${NUM.format(d.medidas.area)} m²</td></tr>
    <tr><th>Estimativa de embalagem</th><td>${d.medidas.rolos} rolos de 15 metros</td></tr>
  </table>

  <h2>02. Logística</h2>
  <table>
    <tr><th>Modalidade</th><td>${entrega ? 'Entrega técnica própria' : 'Retirada na fábrica (Sorocaba/SP)'}</td></tr>
    ${entrega && enderecoTexto ? `<tr><th>Endereço da obra</th><td>${enderecoTexto}</td></tr>` : ''}
    ${entrega && o.frete.distanciaKm != null ? `<tr><th>Distância estimada</th><td>${o.frete.distanciaKm} km${o.frete.pedagios ? ' • pedágio estimado ' + BRL.format(o.frete.pedagios) : ''}</td></tr>` : ''}
  </table>

  <h2>03. Valores</h2>
  <table>
    <tr><th>Item</th><th class="valor">Valor</th></tr>
    <tr><td>Matéria-prima e produção sob medida</td><td class="valor">${BRL.format(o.materiaPrima)}</td></tr>
    <tr><td>Acessórios homologados (mourões e fixadores)</td><td class="valor">${BRL.format(o.acessorios)}</td></tr>
    <tr><td>${entrega ? 'Frete técnico' : 'Retirada na fábrica'}</td><td class="valor">${BRL.format(o.frete.valor)}</td></tr>
    <tr class="desconto"><td>Desconto comercial à vista (${NUM.format(o.descontoPct)}%)</td><td class="valor">- ${BRL.format(o.desconto)}</td></tr>
  </table>

  <div class="total">
    <span>INVESTIMENTO TOTAL<small>ou em ${o.parcelas}x de ${BRL.format(o.valorParcela)} no cartão</small></span>
    <strong>${BRL.format(o.total)}</strong>
  </div>
  <p class="nota">Valores sujeitos à confirmação da fábrica no momento do pedido e ao estoque de matéria-prima.</p>

  <div class="footer">
    Amaral Alambrados • Sorocaba/SP • (15) 3231-4537 • amaralambrados109@gmail.com<br>
    Documento gerado pelo configurador do site.
  </div>
  <script>window.onload = function () { window.focus(); window.print(); };</script>
</body>
</html>`);
    janela.document.close();
    return true;
  }
}
