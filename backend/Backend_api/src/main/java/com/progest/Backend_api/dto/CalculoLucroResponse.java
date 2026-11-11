package com.progest.Backend_api.dto;

import java.math.BigDecimal;
import java.time.YearMonth;

public record CalculoLucroResponse(
    YearMonth mes,
    BigDecimal totalEntradas,
    BigDecimal totalSaidas,
    BigDecimal lucroLiquido,
    BigDecimal margemLucro
) {}