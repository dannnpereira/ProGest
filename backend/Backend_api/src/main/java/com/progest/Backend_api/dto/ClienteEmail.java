package com.progest.Backend_api.dto;

// Regra unica de formato de e-mail do cadastro de clientes (o site usa a mesma).
// De proposito simples: so exige "algo@dominio.ext", sem espacos no meio.
public final class ClienteEmail {

    public static final String FORMATO = "^\\s*[^\\s@]+@[^\\s@]+\\.[^\\s@]+\\s*$";

    private ClienteEmail() {
    }
}
