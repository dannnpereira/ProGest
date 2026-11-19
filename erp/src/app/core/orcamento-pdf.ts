import { Orcamento } from './produtos.service';
import { mascaraCpf, mascaraTelefone } from './documentos';
import { moeda, num } from './formato';

export interface DadosPdfOrcamento {
  numero: string;
  emitidoEm: Date;
  validadeDias: number;
  emitidoPor: string;
  cliente: { nome: string; cpf: string; telefone: string | null; email: string | null } | null;
  arame: string;
  malha: string;
  tratamento: string;
  alturaM: number;
  comprimentoM: number;
  entrega: { cep: string; endereco: string | null } | null; // null = retirada na fábrica
  valores: Orcamento;
}

const EMPRESA = 'Amaral Alambrados';
const ENDERECO_FABRICA = 'Rua Vasco da Gama, 109 - Vila Progresso - Sorocaba/SP - CEP 18090-390';

/** Nome sugerido para o arquivo: "Orcamento ORC-20261119-4821 - Maria Silva" */
export function tituloArquivo(d: DadosPdfOrcamento): string {
  const nome = d.cliente?.nome.trim();
  return `Orcamento ${d.numero}${nome ? ' - ' + nome : ''}`;
}

/**
 * Abre o orçamento formatado numa janela e chama a impressão do navegador,
 * onde o administrador escolhe "Salvar como PDF". Precisa ser chamado direto
 * do clique, senão o navegador bloqueia a janela.
 * Retorna false se a janela foi bloqueada.
 */
export function abrirPdfOrcamento(d: DadosPdfOrcamento): boolean {
  const janela = window.open('', '_blank');
  if (!janela) return false;
  janela.document.open();
  janela.document.write(htmlOrcamento(d));
  janela.document.close();
  return true;
}

export function htmlOrcamento(d: DadosPdfOrcamento): string {
  const v = d.valores;
  const validade = new Date(d.emitidoEm);
  validade.setDate(validade.getDate() + d.validadeDias);
  const area = Number(v.areaM2);
  const aPrazo = Number(v.valorParcela) * v.parcelas;
  const frete = Number(v.frete.valor);

  const cliente = d.cliente
    ? `<table class="dados">
        <tr><th>Nome</th><td>${esc(d.cliente.nome)}</td><th>CPF</th><td>${esc(mascaraCpf(d.cliente.cpf))}</td></tr>
        <tr><th>Telefone</th><td>${esc(d.cliente.telefone ? mascaraTelefone(d.cliente.telefone) : '—')}</td>
            <th>E-mail</th><td>${esc(d.cliente.email || '—')}</td></tr>
      </table>`
    : `<p class="muted">Orçamento avulso, sem cliente cadastrado.</p>`;

  const entrega = d.entrega
    ? `<p><strong>Entrega técnica própria</strong> — CEP ${esc(d.entrega.cep)}</p>
       ${d.entrega.endereco ? `<p>${esc(d.entrega.endereco)}</p>` : ''}
       ${v.frete.distanciaKm ? `<p class="muted">Distância estimada: ${num(Number(v.frete.distanciaKm))} km</p>` : ''}`
    : `<p><strong>Retirada na fábrica</strong> — ${ENDERECO_FABRICA}</p>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${esc(tituloArquivo(d))}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111418; margin: 0; font-size: 12.5px; line-height: 1.45; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
    border-bottom: 3px solid #111418; padding-bottom: 12px; margin-bottom: 18px; }
  .marca { font-size: 20px; font-weight: 800; letter-spacing: .04em; }
  .marca small { display: block; font-size: 11px; font-weight: 400; color: #4b5563; letter-spacing: 0; }
  .num { text-align: right; }
  .num strong { font-size: 15px; }
  .selo { display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 4px; background: #fff4dc;
    color: #7a4b00; font-size: 10.5px; font-weight: 700; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #4b5563;
    border-bottom: 1px solid #e6e8ec; padding-bottom: 4px; margin: 20px 0 8px; }
  p { margin: 2px 0; }
  .muted { color: #4b5563; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 7px 8px; border: 1px solid #e6e8ec; text-align: left; vertical-align: top; }
  th { background: #f7f8fa; font-weight: 600; width: 18%; }
  .valores td:last-child { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .desconto td { color: #12704a; }
  .total { margin-top: 12px; padding: 12px 14px; border-radius: 6px; background: #111418; color: #fff;
    display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .total strong { font-size: 20px; color: #f5b23d; font-variant-numeric: tabular-nums; }
  footer { margin-top: 28px; padding-top: 8px; border-top: 1px solid #e6e8ec; font-size: 10.5px; color: #8a93a0; text-align: center; }
</style>
</head>
<body>
<header>
  <div class="marca">${EMPRESA.toUpperCase()}<small>Telas e alambrados sob medida</small></div>
  <div class="num">
    <strong>Orçamento ${esc(d.numero)}</strong>
    <p>Emitido em ${d.emitidoEm.toLocaleDateString('pt-BR')}</p>
    <span class="selo">VÁLIDO ATÉ ${validade.toLocaleDateString('pt-BR')}</span>
  </div>
</header>

<h2>Cliente</h2>
${cliente}

<h2>Especificação da tela</h2>
<table class="dados">
  <tr><th>Arame</th><td>${esc(d.arame)}</td></tr>
  <tr><th>Malha</th><td>${esc(d.malha)}</td></tr>
  <tr><th>Tratamento</th><td>${esc(d.tratamento)}</td></tr>
  <tr><th>Medidas</th><td>${num(d.comprimentoM, d.comprimentoM % 1 ? 2 : 0)} m de comprimento × ${num(d.alturaM, d.alturaM % 1 ? 2 : 0)} m de altura (${num(area, 2)} m²)</td></tr>
</table>

<h2>Entrega</h2>
${entrega}

<h2>Valores</h2>
<table class="valores">
  <tr><td>Matéria-prima e produção sob medida</td><td>${moeda(Number(v.materiaPrima))}</td></tr>
  <tr><td>Acessórios (mourões e fixadores)</td><td>${moeda(Number(v.acessorios))}</td></tr>
  <tr><td>${d.entrega ? 'Frete técnico' : 'Retirada na fábrica'}</td><td>${moeda(frete)}</td></tr>
  <tr class="desconto"><td>Desconto à vista (Pix / transferência)</td><td>- ${moeda(Number(v.desconto))}</td></tr>
</table>
<div class="total">
  <span>TOTAL À VISTA<br><small>ou ${v.parcelas}x de ${moeda(Number(v.valorParcela))} no cartão (${moeda(aPrazo)})</small></span>
  <strong>${moeda(Number(v.total))}</strong>
</div>

<footer>
  <p>${EMPRESA} · ${ENDERECO_FABRICA}</p>
  <p>Orçamento emitido por ${esc(d.emitidoPor)} pelo ProGest. Valores sujeitos a confirmação após a validade.</p>
</footer>
<script>
  window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 150); });
</script>
</body>
</html>`;
}

/** Escapa o texto digitado antes de entrar no HTML do PDF. */
function esc(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
