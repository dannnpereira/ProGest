package com.progest.Backend_api.dto;

import com.progest.Backend_api.model.Cliente;
import com.progest.Backend_api.model.PedidoCliente;
import com.progest.Backend_api.model.StatusPedidoCliente;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.Locale;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Pedido no formato que as telas do ERP já usam (Aprovação e Produção).
 * valorMaterial = matéria-prima + acessórios - desconto, para que
 * valorMaterial + valorFrete seja o total pago pelo cliente.
 */
public record PedidoErpResponse(
        Long id,
        String codigo,
        Instant criadoEm,
        ClienteErp cliente,
        String destino,
        String fio,
        String malha,
        BigDecimal alturaM,
        BigDecimal metragemM,
        String tratamento,
        String rolos,
        Frete frete,
        BigDecimal valorMaterial,
        BigDecimal valorFrete,
        String observacao,
        StatusPedidoCliente status,
        Instant aprovadoEm,
        Instant recusadoEm,
        String motivoRecusa,
        Instant producaoIniciadaEm,
        Instant entregueEm,
        LocalDate previsaoEntrega
) {
    public record ClienteErp(String nome, String tipo, String documento, String cidade, String uf,
                             String telefone, String email) {
    }

    public record Frete(String tipo, Integer distanciaKm, String descricao) {
    }

    public static PedidoErpResponse de(PedidoCliente p) {
        Cliente c = p.getCliente();
        var cliente = new ClienteErp(c.getNome(), "Pessoa física", "CPF " + formatarCpf(c.getCpf()),
                p.isEntrega() ? nvl(p.getCidade()) : "Retirada", p.isEntrega() ? nvl(p.getUf()) : "na fábrica",
                c.getTelefone() == null ? "" : c.getTelefone().replaceAll("\\D", ""), c.getEmail());

        var frete = p.isEntrega()
                ? new Frete("ENTREGA", p.getDistanciaKm(), "Entrega técnica própria"
                    + (p.getDistanciaKm() != null ? " • " + p.getDistanciaKm() + " km" : ""))
                : new Frete("RETIRADA", null, "Retirada na fábrica (Sorocaba/SP)");

        int rolos = p.getComprimentoM().divide(BigDecimal.valueOf(15), 0, RoundingMode.CEILING).intValue();

        return new PedidoErpResponse(p.getId(), p.getCodigo(), p.getCriadoEm(), cliente,
                p.isEntrega() ? nvl(p.getEndereco()) : "Retirada na fábrica (Sorocaba/SP)",
                p.getArame(), p.getMalha(), p.getAlturaM(), p.getComprimentoM(), p.getTratamento(),
                rolos + " rolos x 15m", frete,
                p.getValorMateriaPrima().add(p.getValorAcessorios()).subtract(p.getValorDesconto()),
                p.getValorFrete(),
                "Pedido feito pelo site • " + p.getParcelas() + "x de "
                        + NumberFormat.getCurrencyInstance(Locale.of("pt", "BR")).format(p.getValorParcela()),
                p.getStatus(), p.getAprovadoEm(), p.getRecusadoEm(), p.getMotivoRecusa(),
                p.getProducaoIniciadaEm(), p.getEntregueEm(), p.getPrevisaoEntrega());
    }

    private static String formatarCpf(String cpf) {
        if (cpf == null || cpf.length() != 11) {
            return nvl(cpf);
        }
        return cpf.substring(0, 3) + "." + cpf.substring(3, 6) + "." + cpf.substring(6, 9) + "-" + cpf.substring(9);
    }

    private static String nvl(String s) {
        return s == null ? "" : s;
    }
}
