package com.progest.Backend_api.dto;

import com.progest.Backend_api.model.Cliente;

// Dados do cliente devolvidos ao frontend (sem senha e sem CPF - LGPD)
public record ClienteResponse(
        Long id,
        String nome,
        String email,
        String telefone
) {
    public static ClienteResponse de(Cliente cliente) {
        return new ClienteResponse(
                cliente.getId(),
                cliente.getNome(),
                cliente.getEmail(),
                cliente.getTelefone()
        );
    }
}
