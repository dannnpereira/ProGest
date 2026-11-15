package com.progest.Backend_api.dto;

import com.progest.Backend_api.model.Cliente;

/**
 * Dados do cadastro mostrados na tela "Meu perfil". O CPF vai mascarado
 * (529.***.***-25): o cliente reconhece o próprio, mas ele não fica exposto
 * inteiro no navegador.
 */
public record PerfilResponse(String nome, String email, String telefone, String cpf) {

    public static PerfilResponse de(Cliente c) {
        return new PerfilResponse(c.getNome(), c.getEmail(), c.getTelefone(), mascarar(c.getCpf()));
    }

    static String mascarar(String cpf) {
        if (cpf == null || cpf.length() != 11) {
            return "";
        }
        return cpf.substring(0, 3) + ".***.***-" + cpf.substring(9);
    }
}
