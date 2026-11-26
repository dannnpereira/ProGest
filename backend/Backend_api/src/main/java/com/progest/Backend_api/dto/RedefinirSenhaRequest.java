package com.progest.Backend_api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Tela "Nova senha" do site: o token do link e a senha nova (mesma regra do cadastro)
public record RedefinirSenhaRequest(
        @NotBlank @Size(max = 100) String token,
        @NotBlank @Size(min = 8, max = 72) String senha
) {
}
