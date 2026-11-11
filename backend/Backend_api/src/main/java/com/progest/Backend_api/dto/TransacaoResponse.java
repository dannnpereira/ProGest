package com.progest.Backend_api.dto;

import com.progest.Backend_api.model.TipoTransacao;
import com.progest.Backend_api.model.TipoDespesa;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransacaoResponse(
    Long id,
    Long op,
    TipoTransacao tipo,
    String descricao,
    String fornecedores,
    BigDecimal valor,
    LocalDate dataMovimentacao,
    TipoDespesa tipoDespesa
) {}