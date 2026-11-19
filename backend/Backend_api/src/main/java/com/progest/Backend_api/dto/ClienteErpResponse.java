package com.progest.Backend_api.dto;

import com.progest.Backend_api.model.Cliente;

// Cliente como o ERP ve na tela de orcamento. Diferente do ClienteResponse do site,
// leva o CPF: so sai em rotas /api/erp/ (login do administrador) e o administrador
// acabou de digita-lo. Nunca leva a senha.
public record ClienteErpResponse(
        Long id,
        String nome,
        String cpf,
        String email,
        String telefone,
        // false = cliente registrado so por um pedido, ainda sem senha
        boolean temConta
) {
    public static ClienteErpResponse de(Cliente cliente) {
        return new ClienteErpResponse(
                cliente.getId(),
                cliente.getNome(),
                cliente.getCpf(),
                cliente.getEmail(),
                cliente.getTelefone(),
                cliente.getSenhaHash() != null
        );
    }
}
