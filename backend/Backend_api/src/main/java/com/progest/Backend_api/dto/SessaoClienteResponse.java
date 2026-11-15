package com.progest.Backend_api.dto;

import java.time.Instant;

// Resposta do login/cadastro do site: o token vai em "Authorization: Bearer <token>"
// nas chamadas para /api/conta/**
public record SessaoClienteResponse(
        String token,
        Instant expiraEm,
        ClienteResponse usuario
) {
}
