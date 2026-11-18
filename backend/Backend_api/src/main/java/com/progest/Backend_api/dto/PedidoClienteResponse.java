package com.progest.Backend_api.dto;

import com.progest.Backend_api.model.PedidoCliente;
import com.progest.Backend_api.model.StatusPedidoCliente;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;

// Pedido como o cliente vê em "Acompanhar pedido" (só os pedidos dele).
// Traz a composição dos valores para a ficha técnica do pedido sair igual ao que foi pedido.
public record PedidoClienteResponse(
        Long id,
        String codigo,
        Instant criadoEm,
        StatusPedidoCliente status,
        String arame,
        String malha,
        String tratamento,
        String arameNome,
        String malhaNome,
        String tratamentoNome,
        BigDecimal alturaM,
        BigDecimal comprimentoM,
        boolean entrega,
        String endereco,
        Integer distanciaKm,
        BigDecimal valorMateriaPrima,
        BigDecimal valorAcessorios,
        BigDecimal valorFrete,
        BigDecimal descontoPct,
        BigDecimal valorDesconto,
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
        BigDecimal base = p.getValorMateriaPrima().add(p.getValorAcessorios());
        BigDecimal pct = base.signum() == 0 ? BigDecimal.ZERO
                : p.getValorDesconto().multiply(BigDecimal.valueOf(100)).divide(base, 2, RoundingMode.HALF_UP);
        return new PedidoClienteResponse(p.getId(), p.getCodigo(), p.getCriadoEm(), p.getStatus(),
                p.getArame(), p.getMalha(), p.getTratamento(),
                p.getArameNome(), p.getMalhaNome(), p.getTratamentoNome(), p.getAlturaM(), p.getComprimentoM(),
                p.isEntrega(), p.getEndereco(), p.getDistanciaKm(),
                p.getValorMateriaPrima(), p.getValorAcessorios(), p.getValorFrete(), pct, p.getValorDesconto(),
                p.getValorTotal(), p.getParcelas(), p.getValorParcela(),
                p.getMotivoRecusa(), p.getAprovadoEm(), p.getProducaoIniciadaEm(), p.getEntregueEm(),
                p.getPrevisaoEntrega());
    }
}
