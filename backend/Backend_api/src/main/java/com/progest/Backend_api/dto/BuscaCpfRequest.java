package com.progest.Backend_api.dto;

import jakarta.validation.constraints.NotBlank;

// CPF vai no corpo (POST) e nao na URL para nao ficar gravado em logs de acesso
public record BuscaCpfRequest(@NotBlank(message = "Informe o CPF.") String cpf) {
}
