package com.progest.Backend_api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// O token vai no corpo (e nao na URL) para nao ficar em logs de acesso
public record TokenSenhaRequest(
        @NotBlank @Size(max = 100) String token
) {
}
