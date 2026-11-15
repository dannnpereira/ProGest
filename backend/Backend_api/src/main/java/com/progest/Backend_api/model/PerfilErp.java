package com.progest.Backend_api.model;

/**
 * O que cada usuario do ERP pode acessar.
 * ADMIN: todas as telas. FUNCIONARIO: so Producao e Entregas.
 */
public enum PerfilErp {
    ADMIN,
    FUNCIONARIO
}
