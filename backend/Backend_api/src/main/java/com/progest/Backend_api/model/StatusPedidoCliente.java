package com.progest.Backend_api.model;

/**
 * Situação de um pedido feito pelo site. Os três últimos são as etapas da produção
 * (mesmos nomes do StatusWorkflow).
 *
 * AGUARDANDO_APROVACAO -> A_FAZER -> EM_PROCESSO -> ENTREGUE
 *                    \-> RECUSADO
 */
public enum StatusPedidoCliente {
    AGUARDANDO_APROVACAO,
    RECUSADO,
    A_FAZER,
    EM_PROCESSO,
    ENTREGUE
}
