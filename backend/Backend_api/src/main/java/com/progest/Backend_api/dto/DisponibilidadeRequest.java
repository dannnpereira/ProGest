package com.progest.Backend_api.dto;

// Pergunta se CPF e/ou e-mail ja tem conta. Vai no corpo (POST) e nao na URL
// para o CPF nao ficar gravado em logs de acesso.
public record DisponibilidadeRequest(String cpf, String email) {
}
