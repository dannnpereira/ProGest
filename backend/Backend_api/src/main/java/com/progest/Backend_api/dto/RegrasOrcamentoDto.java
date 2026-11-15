package com.progest.Backend_api.dto;

import com.progest.Backend_api.model.RegrasOrcamento;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

// Desconto a vista (%) e numero maximo de parcelas do orcamento
public record RegrasOrcamentoDto(
        @NotNull @DecimalMin("0.00") @DecimalMax("50.00") @Digits(integer = 3, fraction = 2) BigDecimal descontoAVistaPct,
        @NotNull @Min(1) @Max(24) Integer parcelasMax
) {
    public static RegrasOrcamentoDto de(RegrasOrcamento r) {
        return new RegrasOrcamentoDto(r.getDescontoAVistaPct(), r.getParcelasMax());
    }
}
