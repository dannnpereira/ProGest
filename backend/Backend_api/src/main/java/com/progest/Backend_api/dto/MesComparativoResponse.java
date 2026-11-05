package com.progest.Backend_api.dto;

import java.math.BigDecimal;
import java.time.YearMonth;

public record MesComparativoResponse(
    YearMonth mes,
    BigDecimal totalEntradas,
    BigDecimal totalSaidas,
    BigDecimal saldoPeriodo,
    BigDecimal variacaoEntradasPercentual,
    BigDecimal variacaoSaidasPercentual
) {
}
