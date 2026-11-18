package com.progest.Backend_api.dto;

import com.progest.Backend_api.model.PrecoTela;
import com.progest.Backend_api.model.UnidadePreco;

import java.math.BigDecimal;

public record PrecoTelaResponse(
        Long id,
        String arame,
        String malha,
        String tratamento,
        UnidadePreco unidade,
        BigDecimal pesoKgM2,
        BigDecimal valorVista,
        BigDecimal valorPrazo
) {
    public static PrecoTelaResponse de(PrecoTela p) {
        return new PrecoTelaResponse(p.getId(), p.getArame(), p.getMalha(), p.getTratamento(), p.getUnidade(),
                p.getPesoKgM2(), p.getValorVista(), p.getValorPrazo());
    }
}
