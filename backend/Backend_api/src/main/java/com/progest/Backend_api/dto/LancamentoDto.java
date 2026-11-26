package com.progest.Backend_api.dto;

import com.progest.Backend_api.model.CategoriaDespesa;
import com.progest.Backend_api.model.LancamentoFinanceiro;
import com.progest.Backend_api.model.StatusLancamento;
import com.progest.Backend_api.model.TipoLancamento;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Lançamento do Financeiro do ERP, como as telas enviam e recebem. */
public record LancamentoDto(
        Long id,
        TipoLancamento tipo,
        LocalDate data,
        CategoriaDespesa categoria,
        String descricao,
        String favorecido,
        String quantidade,
        BigDecimal valor,
        StatusLancamento status
) {
    public static LancamentoDto de(LancamentoFinanceiro l) {
        return new LancamentoDto(l.getId(), l.getTipo(), l.getData(), l.getCategoria(), l.getDescricao(),
                l.getFavorecido(), l.getQuantidade(), l.getValor(), l.getStatus());
    }
}
