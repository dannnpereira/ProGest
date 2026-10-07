import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  gerarOrcamentoPdf(dadosOrcamento: {
    configuracao: any,
    medidas: any,
    precos: any,
    frete: any,
    endereco: any,
    tipoFrete: string
  }) {
    // Cria uma janela oculta ou elemento temporário para impressão/geração limpa do PDF
    const janelaPrint = window.open('', '_blank');
    if (!janelaPrint) {
      alert('Por favor, permita pop-ups para descarregar o PDF.');
      return;
    }

    const htmlConteudo = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Orçamento Técnico - Amaral Alambrados</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; background: #fff; }
          .header { border-bottom: 3px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .logo { font-size: 24px; font-weight: bold; color: #0f172a; letter-spacing: 1px; }
          .badge { background: #fef08a; color: #854d0e; padding: 4px 10px; font-size: 12px; font-weight: bold; border-radius: 4px; }
          h2 { color: #0f172a; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-top: 25px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 14px; }
          th { background: #f1f5f9; color: #334155; }
          .total-box { margin-top: 20px; background: #0f172a; color: #fff; padding: 15px; border-radius: 6px; text-align: right; }
          .total-box h3 { margin: 0; font-size: 22px; color: #38bdf8; }
          .footer { margin-top: 40px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">AMARAL ALAMBRADOS</div>
            <p style="margin: 2px 0; font-size: 13px; color: #64748b;">Engenharia e Soluções em Cercamentos</p>
          </div>
          <div>
            <span class="badge">ORÇAMENTO VÁLIDO POR 7 DIAS</span>
            <p style="margin: 5px 0 0 0; font-size: 12px; text-align: right; color: #64748b;">Data: ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <h2>01. ESPECIFICAÇÕES TÉCNICAS DA CERCA</h2>
        <table>
          <tr>
            <th>Parâmetro</th>
            <th>Detalhe Escolhido</th>
          </tr>
          <tr>
            <td>Bitola do Arame (Espessura)</td>
            <td>${dadosOrcamento.configuracao.bitola === 'fio12' ? 'Fio 12 (2,77 mm) - Alta Resistência' : 'Fio 14 (2,10 mm) - Residencial'}</td>
          </tr>
          <tr>
            <td>Malha / Abertura</td>
            <td>${dadosOrcamento.configuracao.malha === 'malha2' ? 'Malha 2" (50 mm)' : 'Malha 3" (75 mm)'}</td>
          </tr>
          <tr>
            <td>Tratamento Anticorrosivo</td>
            <td>${dadosOrcamento.configuracao.tratamento === 'galvanizado' ? 'Galvanizada a Fogo' : 'Revestida em PVC'}</td>
          </tr>
          <tr>
            <td>Dimensões do Projeto</td>
            <td>Altura: ${dadosOrcamento.medidas.altura}m | Comprimento: ${dadosOrcamento.medidas.comprimento} metros (${dadosOrcamento.medidas.area} m² totais)</td>
          </tr>
          <tr>
            <td>Estimativa de Embalagem</td>
            <td>${dadosOrcamento.medidas.rolos} rolos padrão de 15 metros</td>
          </tr>
        </table>

        <h2>02. LOGÍSTICA E ENTREGA</h2>
        <p style="font-size: 14px;"><strong>Modalidade:</strong> ${dadosOrcamento.tipoFrete === 'entrega' ? 'Entrega Técnica Própria (Carga paletizada)' : 'Retirada na Fábrica (Sorocaba/SP)'}</p>
        ${dadosOrcamento.tipoFrete === 'entrega' && dadosOrcamento.endereco ? `
          <p style="font-size: 14px;"><strong>Endereço de Destino:</strong> ${dadosOrcamento.endereco.logradouro}, ${dadosOrcamento.endereco.bairro} -${dadosOrcamento.endereco.localidade}/${dadosOrcamento.endereco.uf} (CEP:${dadosOrcamento.endereco.cep})</p>
          <p style="font-size: 13px; color: #475569;">Distância estimada percorrida: ${dadosOrcamento.frete?.distanciaKm || 0} km | Pedágio proporcional: R$ ${dadosOrcamento.frete?.pedagios?.toFixed(2) || '0.00'}</p>
        ` : ''}

        <h2>03. COMPOSIÇÃO DE VALORES E INVESTIMENTO</h2>
        <table>
          <tr>
            <th>Descrição do Item</th>
            <th style="text-align: right;">Valor (R$)</th>
          </tr>
          <tr>
            <td>Matéria-Prima e Produção Sob Medida</td>
            <td style="text-align: right;">R$ ${dadosOrcamento.precos.materiaPrima.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Acessórios Homologados</td>
            <td style="text-align: right;">R$ ${dadosOrcamento.precos.acessorios.toFixed(2)}</td>
          </tr>
          <tr>
            <td>${dadosOrcamento.tipoFrete === 'entrega' ? 'Frete Técnico (Logística Própria)' : 'Retirada na Fábrica'}</td>
            <td style="text-align: right;">R$ ${dadosOrcamento.tipoFrete === 'entrega' ? dadosOrcamento.precos.frete.toFixed(2) : '0,00'}</td>
          </tr>
          <tr style="color: #16a34a; font-weight: bold;">
            <td>Desconto Comercial À Vista (5%)</td>
            <td style="text-align: right;">- R$ ${dadosOrcamento.precos.desconto.toFixed(2)}</td>
          </tr>
        </table>

        <div class="total-box">
          <span style="font-size: 13px; letter-spacing: 1px;">INVESTIMENTO TOTAL À VISTA</span>
          <h3>R$ ${dadosOrcamento.precos.total.toFixed(2)}</h3>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #cbd5e1;">Ou em até 10x de R$ ${dadosOrcamento.precos.parcela.toFixed(2)} no cartão</p>
        </div>

        <div class="footer">
          <p>Amaral Alambrados - CNPJ e Dados da Empresa | Fábrica: Sorocaba/SP - CEP 18090-390</p>
          <p>Documento gerado eletronicamente pelo Configurador Inteligente.</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    janelaPrint.document.write(htmlConteudo);
    janelaPrint.document.close();
  }
}