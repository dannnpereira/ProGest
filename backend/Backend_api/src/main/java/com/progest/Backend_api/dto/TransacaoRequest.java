package com.progest.Backend_api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransacaoRequest(
    Long op,
    String descricao,
    String fornecedores,
    BigDecimal valor,
    LocalDate dataMovimentacao
) {
}
