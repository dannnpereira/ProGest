package com.progest.Backend_api.dto;

import com.progest.Backend_api.model.CategoriaProduto;
import com.progest.Backend_api.model.UnidadeProduto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

// Cadastro / edicao de produto pela Tela 5 do ERP
public record ProdutoRequest(
        @NotNull CategoriaProduto categoria,
        @NotBlank @Size(min = 3, max = 120) String nome,
        @Size(max = 255) String descricao,
        @NotNull UnidadeProduto unidade,
        @NotNull @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal valor,
        boolean ativo
) {
}
