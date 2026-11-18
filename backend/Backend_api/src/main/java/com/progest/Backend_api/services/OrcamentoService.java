package com.progest.Backend_api.services;

import com.progest.Backend_api.dto.OrcamentoRequest;
import com.progest.Backend_api.dto.OrcamentoResponse;
import com.progest.Backend_api.model.CategoriaProduto;
import com.progest.Backend_api.model.Produto;
import com.progest.Backend_api.model.RegrasOrcamento;
import com.progest.Backend_api.repository.ProdutoRepository;
import com.progest.Backend_api.repository.RegrasOrcamentoRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Calculo do orcamento do configurador. Fica aqui (e nao no site) para que os precos
 * e regras editados no ERP valham na hora, e para o cliente nao conseguir mudar o valor
 * pelo navegador.
 *
 *   materia-prima = area (m2) x (arame + malha + tratamento)
 *   acessorios    = comprimento x soma dos acessorios ativos (por metro linear)
 *   desconto      = (materia-prima + acessorios) x desconto a vista %
 *   total         = materia-prima + acessorios + frete - desconto
 *   parcela       = total / parcelas
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

    public OrcamentoService(ProdutoRepository produtos, RegrasOrcamentoRepository regras) {
        this.produtos = produtos;
        this.regras = regras;
    }

    public OrcamentoResponse calcular(OrcamentoRequest req) {
        Map<String, Produto> ativos = produtos.findByAtivoTrueAndExcluidoFalseOrderByIdAsc().stream()
                .filter(p -> p.getChave() != null)
                .collect(Collectors.toMap(Produto::getChave, Function.identity()));

        BigDecimal arame = valor(ativos, req.arame(), CategoriaProduto.ARAME);
        BigDecimal malha = valor(ativos, req.malha(), CategoriaProduto.MALHA);
        BigDecimal tratamento = valor(ativos, req.tratamento(), CategoriaProduto.TRATAMENTO);
        // Todos os acessorios ativos entram no kit (valor por metro linear de cerca)
        BigDecimal acessorioPorMetro = ativos.values().stream()
                .filter(p -> p.getCategoria() == CategoriaProduto.ACESSORIOS)
                .map(Produto::getValor).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal area = req.alturaM().multiply(req.comprimentoM());
        BigDecimal materiaPrima = reais(area.multiply(arame.add(malha).add(tratamento)));
        BigDecimal acessorios = reais(req.comprimentoM().multiply(acessorioPorMetro));
        OrcamentoResponse.Frete frete = req.entrega() ? frete(req.cep()) : semFrete();

        RegrasOrcamento r = regras.findById(RegrasOrcamento.ID_UNICO).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Regras do orçamento não configuradas."));
        BigDecimal desconto = reais(materiaPrima.add(acessorios).multiply(r.getDescontoAVistaPct()).divide(CEM));
        BigDecimal total = materiaPrima.add(acessorios).add(frete.valor()).subtract(desconto);
        int parcelas = Math.max(1, r.getParcelasMax());

        return new OrcamentoResponse(
                area.setScale(2, RoundingMode.HALF_UP), materiaPrima, acessorios, frete,
                r.getDescontoAVistaPct(), desconto, total,
                parcelas, total.divide(BigDecimal.valueOf(parcelas), 2, RoundingMode.HALF_UP));
    }

    private static BigDecimal valor(Map<String, Produto> ativos, String chave, CategoriaProduto categoria) {
        Produto p = ativos.get(chave);
        if (p == null || p.getCategoria() != categoria) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,
                    "Esta opção não está disponível no momento.");
        }
        return p.getValor();
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
