package com.progest.Backend_api.dto;

import com.progest.Backend_api.model.PrecoTela;

/** Combinacao que o cliente pode escolher no site (sem preco): GET /api/catalogo/combinacoes */
public record CombinacaoItem(String arame, String malha, String tratamento) {

    public static CombinacaoItem de(PrecoTela p) {
        return new CombinacaoItem(p.getArame(), p.getMalha(), p.getTratamento());
    }
}
