package com.progest.Backend_api.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/**
 * Escolhas do configurador do site. Os produtos vao pela "chave" (FIO_12, MALHA_3, PVC...).
 * O preco NAO vem do navegador: a API busca no banco, que e editado pelo ERP.
 */
public record OrcamentoRequest(
        @NotBlank String arame,
        @NotBlank String malha,
        @NotBlank String tratamento,
        @NotNull(message = "Informe a altura.")
        @DecimalMin(value = "0.1", message = "Informe a altura.")
        @DecimalMax(value = "10", message = "Altura máxima de 10 metros.") BigDecimal alturaM,
        @NotNull(message = "Informe o comprimento.")
        @DecimalMin(value = "1", message = "Informe o comprimento.")
        @DecimalMax(value = "10000", message = "Comprimento máximo de 10.000 metros.") BigDecimal comprimentoM,
        // true = entrega tecnica propria; false = retirada na fabrica
        boolean entrega,
        // CEP da obra (so para entrega). Sem CEP, usa o frete minimo.
        String cep
) {
}
