package com.progest.Backend_api.dto;

import com.progest.Backend_api.model.TipoDespesa;
import java.math.BigDecimal;
import java.time.LocalDate;

public record DespesaRequest(
    String descricao,
    String fornecedores,
    BigDecimal valor,
    LocalDate dataMovimentacao,
    TipoDespesa tipoDespesa
) {}