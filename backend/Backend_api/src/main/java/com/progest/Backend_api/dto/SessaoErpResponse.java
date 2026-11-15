package com.progest.Backend_api.dto;

import java.time.Instant;

// Resposta do login do ERP: o token vai no cabecalho "Authorization: Bearer <token>"
// das proximas chamadas para /api/erp/**
public record SessaoErpResponse(
        String token,
        Instant expiraEm,
        UsuarioErpResponse usuario
) {
}
