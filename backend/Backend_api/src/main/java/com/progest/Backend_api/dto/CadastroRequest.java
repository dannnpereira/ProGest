package com.progest.Backend_api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Dados enviados pela aba "Cadastrar" da tela de login
public record CadastroRequest(
        @NotBlank @Size(min = 3, max = 150) String nome,
        @NotBlank String cpf,
        @NotBlank @Size(max = 20) String telefone,
        @NotBlank @Email @Size(max = 150) String email,
        @NotBlank @Size(min = 8, max = 72) String senha
) {
}
