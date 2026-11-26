package com.progest.Backend_api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// "Esqueceu a senha?" do site: so o e-mail da conta
public record EsqueciSenhaRequest(
        @NotBlank @Size(max = 150) String email
) {
}
