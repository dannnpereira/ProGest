package com.progest.Backend_api.dto;

import jakarta.validation.constraints.NotBlank;

// Dados enviados pela aba "Entrar" da tela de login
public record LoginRequest(
        @NotBlank String email,
        @NotBlank String senha
) {
}
