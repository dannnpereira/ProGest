package com.progest.Backend_api.dto;

import com.progest.Backend_api.model.UsuarioErp;

// Dados do usuario do ERP que podem ir para a tela (nunca a senha)
public record UsuarioErpResponse(Long id, String nome, String email) {

    public static UsuarioErpResponse de(UsuarioErp u) {
        return new UsuarioErpResponse(u.getId(), u.getNome(), u.getEmail());
    }
}
