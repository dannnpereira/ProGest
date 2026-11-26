package com.progest.Backend_api.dto;

import java.time.Instant;

// Link de nova senha gerado pelo administrador no ERP para mandar ao cliente
public record LinkSenhaResponse(String link, Instant expiraEm) {
}
