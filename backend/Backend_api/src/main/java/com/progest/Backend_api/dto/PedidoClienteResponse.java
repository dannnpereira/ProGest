package com.progest.Backend_api.dto;

import com.progest.Backend_api.model.PedidoCliente;
import com.progest.Backend_api.model.StatusPedidoCliente;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

// Pedido como o cliente vê em "Acompanhar pedido" (só os pedidos dele)
public record PedidoClienteResponse(
        Long id,
        String codigo,
        Instant criadoEm,
        StatusPedidoCliente status,
        String arame,
        String malha,
        String tratamento,
        BigDecimal alturaM,
        BigDecimal comprimentoM,
        boolean entrega,
        String endereco,
        BigDecimal valorTotal,
        int parcelas,
        BigDecimal valorParcela,
        String motivoRecusa,
        Instant aprovadoEm,
        Instant producaoIniciadaEm,
        Instant entregueEm,
        LocalDate previsaoEntrega
) {
    public static PedidoClienteResponse de(PedidoCliente p) {
        return new PedidoClienteResponse(p.getId(), p.getCodigo(), p.getCriadoEm(), p.getStatus(),
                p.getArame(), p.getMalha(), p.getTratamento(), p.getAlturaM(), p.getComprimentoM(),
                p.isEntrega(), p.getEndereco(), p.getValorTotal(), p.getParcelas(), p.getValorParcela(),
                p.getMotivoRecusa(), p.getAprovadoEm(), p.getProducaoIniciadaEm(), p.getEntregueEm(),
                p.getPrevisaoEntrega());
    }
}
