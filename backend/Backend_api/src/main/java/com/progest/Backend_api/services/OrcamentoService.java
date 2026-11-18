package com.progest.Backend_api.services;

import com.progest.Backend_api.dto.OrcamentoRequest;
import com.progest.Backend_api.dto.OrcamentoResponse;
import com.progest.Backend_api.model.CategoriaProduto;
import com.progest.Backend_api.model.PrecoTela;
import com.progest.Backend_api.model.Produto;
import com.progest.Backend_api.model.RegrasOrcamento;
import com.progest.Backend_api.repository.ProdutoRepository;
import com.progest.Backend_api.repository.RegrasOrcamentoRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Calculo do orcamento do configurador. Fica aqui (e nao no site) para que os precos
 * e regras editados no ERP valham na hora, e para o cliente nao conseguir mudar o valor
 * pelo navegador. O preco da tela vem da tabela de precos (arame + malha + tratamento).
 *
 *   materia-prima  = area (m2) x valor A PRAZO da tela   (preco cheio)
 *   acessorios     = comprimento x soma dos acessorios ativos (por metro linear)
 *   desconto       = area x (a prazo - a vista)  +  acessorios x desconto a vista %
 *   total (a vista)= materia-prima + acessorios + frete - desconto
 *   parcela        = (materia-prima + acessorios + frete) / parcelas   (a prazo)
 */
@Service
public class OrcamentoService {

    private static final BigDecimal CEM = BigDecimal.valueOf(100);

    // Frete (mesma regra que o site usava): combustivel por km + pedagio acima de 25 km + taxa base
    private static final BigDecimal COMBUSTIVEL_POR_KM = new BigDecimal("1.45");
    private static final BigDecimal PEDAGIO_POR_KM = new BigDecimal("0.75");
    private static final int KM_SEM_PEDAGIO = 25;
    private static final BigDecimal TAXA_BASE_FRETE = new BigDecimal("50.00");
    private static final BigDecimal FRETE_SEM_CEP = new BigDecimal("150.00");

    private final ProdutoRepository produtos;
    private final RegrasOrcamentoRepository regras;
    private final CatalogoService catalogo;

    public OrcamentoService(ProdutoRepository produtos, RegrasOrcamentoRepository regras, CatalogoService catalogo) {
        this.produtos = produtos;
        this.regras = regras;
        this.catalogo = catalogo;
    }

    public OrcamentoResponse calcular(OrcamentoRequest req) {
        PrecoTela tela = catalogo.tela(req.arame(), req.malha(), req.tratamento()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,
                        "Esta combinação não está disponível no momento."));

        // Todos os acessorios ativos entram no kit (valor por metro linear de cerca)
        BigDecimal acessorioPorMetro = produtos.findByAtivoTrueAndExcluidoFalseOrderByIdAsc().stream()
                .filter(p -> p.getCategoria() == CategoriaProduto.ACESSORIOS)
                .map(Produto::getValor).reduce(BigDecimal.ZERO, BigDecimal::add);

        RegrasOrcamento r = regras.findById(RegrasOrcamento.ID_UNICO).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Regras do orçamento não configuradas."));

        BigDecimal area = req.alturaM().multiply(req.comprimentoM());
        BigDecimal materiaPrima = reais(area.multiply(tela.prazoOuVista()));
        BigDecimal descontoTela = materiaPrima.subtract(reais(area.multiply(tela.getValorVista()))).max(BigDecimal.ZERO);
        BigDecimal acessorios = reais(req.comprimentoM().multiply(acessorioPorMetro));
        BigDecimal descontoAcessorios = reais(acessorios.multiply(r.getDescontoAVistaPct()).divide(CEM));
        OrcamentoResponse.Frete frete = req.entrega() ? frete(req.cep()) : semFrete();

        BigDecimal cheio = materiaPrima.add(acessorios).add(frete.valor());
        BigDecimal desconto = descontoTela.add(descontoAcessorios);
        BigDecimal total = cheio.subtract(desconto);
        BigDecimal base = materiaPrima.add(acessorios);
        BigDecimal descontoPct = base.signum() == 0 ? BigDecimal.ZERO
                : desconto.multiply(CEM).divide(base, 2, RoundingMode.HALF_UP);
        int parcelas = Math.max(1, r.getParcelasMax());

        return new OrcamentoResponse(
                area.setScale(2, RoundingMode.HALF_UP), materiaPrima, acessorios, frete,
                descontoPct, desconto, total,
                parcelas, cheio.divide(BigDecimal.valueOf(parcelas), 2, RoundingMode.HALF_UP));
    }

    private static OrcamentoResponse.Frete semFrete() {
        return new OrcamentoResponse.Frete(BigDecimal.ZERO.setScale(2), null, null, null);
    }

    private static OrcamentoResponse.Frete frete(String cep) {
        String digitos = cep == null ? "" : cep.replaceAll("\\D", "");
        if (digitos.length() != 8) {
            return new OrcamentoResponse.Frete(FRETE_SEM_CEP, null, null, null);
        }
        int km = distanciaKm(digitos);
        BigDecimal combustivel = reais(COMBUSTIVEL_POR_KM.multiply(BigDecimal.valueOf(km)));
        BigDecimal pedagios = km > KM_SEM_PEDAGIO
                ? reais(PEDAGIO_POR_KM.multiply(BigDecimal.valueOf(km)))
                : BigDecimal.ZERO.setScale(2);
        return new OrcamentoResponse.Frete(combustivel.add(pedagios).add(TAXA_BASE_FRETE), km, combustivel, pedagios);
    }

    // Distancia estimada a partir da fabrica em Sorocaba, pela faixa do CEP.
    // (Simulacao; trocar por uma API de rotas quando houver.)
    private static int distanciaKm(String cep) {
        return switch (cep.substring(0, 3)) {
            case "180" -> 10;  // Sorocaba
            case "181" -> 22;  // Votorantim / Aracoiaba
            case "182" -> 48;  // Itapetininga
            case "133" -> 60;  // Itu / Salto
            default -> 95;     // demais destinos no estado
        };
    }

    private static BigDecimal reais(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }
}
