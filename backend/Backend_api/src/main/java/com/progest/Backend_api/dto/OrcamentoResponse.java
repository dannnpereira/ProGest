package com.progest.Backend_api.dto;

import java.math.BigDecimal;

// Orcamento calculado pela API. Todos os valores em reais, com 2 casas.
public record OrcamentoResponse(
        BigDecimal areaM2,
        BigDecimal materiaPrima,
        BigDecimal acessorios,
        Frete frete,
        BigDecimal descontoPct,
        BigDecimal desconto,
        BigDecimal total,
        int parcelas,
        BigDecimal valorParcela
) {
    /** Frete da entrega. Na retirada, valor 0 e demais campos nulos. */
    public record Frete(
            BigDecimal valor,
            Integer distanciaKm,
            BigDecimal combustivel,
            BigDecimal pedagios
    ) {
    }
}
