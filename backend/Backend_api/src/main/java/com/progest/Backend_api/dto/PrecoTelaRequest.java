package com.progest.Backend_api.dto;

import com.progest.Backend_api.model.UnidadePreco;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

// Linha da tabela de precos cadastrada / editada pelo ERP
public record PrecoTelaRequest(
        @NotBlank @Size(max = 30) String arame,
        @Size(max = 30) String malha,           // obrigatoria para M2; vazia para KG
        @NotBlank @Size(max = 30) String tratamento,
        @NotNull UnidadePreco unidade,
        @DecimalMin("0.000") @Digits(integer = 5, fraction = 3) BigDecimal pesoKgM2,
        @NotNull @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal valorVista,
        @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal valorPrazo
) {
}
