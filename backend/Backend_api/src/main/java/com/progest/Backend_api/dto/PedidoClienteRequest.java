package com.progest.Backend_api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/**
 * Pedido enviado pelo botão "Fazer pedido" do configurador.
 * Só vão as escolhas; o preço é recalculado no servidor com os valores do banco.
 */
public record PedidoClienteRequest(
        @NotBlank String arame,
        @NotBlank String malha,
        @NotBlank String tratamento,
        @NotNull @DecimalMin("0.1") @DecimalMax("10") BigDecimal alturaM,
        @NotNull @DecimalMin("1") @DecimalMax("10000") BigDecimal comprimentoM,
        boolean entrega,
        // Obrigatório quando entrega = true
        @Valid Endereco endereco
) {
    public record Endereco(
            @NotBlank @Pattern(regexp = "\\d{5}-?\\d{3}", message = "CEP inválido.") String cep,
            @NotBlank @Size(max = 150) String logradouro,
            @NotBlank(message = "Informe o número do endereço de entrega.") @Size(max = 20) String numero,
            @Size(max = 80) String complemento,
            @Size(max = 80) String bairro,
            @NotBlank @Size(max = 100) String cidade,
            @NotBlank @Size(min = 2, max = 2) String uf
    ) {
    }

    public OrcamentoRequest comoOrcamento() {
        return new OrcamentoRequest(arame, malha, tratamento, alturaM, comprimentoM, entrega,
                endereco == null ? null : endereco.cep());
    }
}
