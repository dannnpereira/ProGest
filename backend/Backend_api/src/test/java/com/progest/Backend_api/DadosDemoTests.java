package com.progest.Backend_api;

import com.progest.Backend_api.model.PedidoCliente;
import com.progest.Backend_api.model.StatusPedidoCliente;
import com.progest.Backend_api.repository.ClienteRepository;
import com.progest.Backend_api.repository.PedidoClienteRepository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

// O seed roda ao subir o contexto (progest.demo.ativo=true)
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:demo;DB_CLOSE_DELAY=-1",
        "progest.demo.ativo=true",
        "progest.demo.senha=senha-demo-123"
})
class DadosDemoTests {

    @Autowired ClienteRepository clientes;
    @Autowired PedidoClienteRepository pedidos;
    @Autowired com.progest.Backend_api.config.DadosDemo demo;
    @Autowired com.progest.Backend_api.config.DadosDemoFinanceiro financeiro;
    @Autowired com.progest.Backend_api.repository.LancamentoFinanceiroRepository lancamentos;

    @Test
    void criaClientesEPedidosEmTodasAsEtapasSemDuplicar() {
        assertEquals(8, clientes.count());
        List<PedidoCliente> todos = pedidos.findAll();
        assertEquals(15, todos.size());

        Set<StatusPedidoCliente> etapas = todos.stream().map(PedidoCliente::getStatus).collect(Collectors.toSet());
        assertEquals(EnumSet.allOf(StatusPedidoCliente.class), etapas);

        for (PedidoCliente p : todos) {
            assertTrue(p.getCodigo().startsWith("AM-"));
            assertTrue(p.getValorTotal().signum() > 0);
            assertFalse(p.getCriadoEm().isAfter(Instant.now()));
            // Linha do tempo em ordem: pedido -> aprovacao -> producao -> entrega
            Instant anterior = p.getCriadoEm();
            for (Instant marco : new Instant[]{p.getAprovadoEm(), p.getProducaoIniciadaEm(), p.getEntregueEm()}) {
                if (marco != null) {
                    assertFalse(marco.isBefore(anterior), p.getCodigo() + ": etapa fora de ordem");
                    anterior = marco;
                }
            }
        }
        assertTrue(clientes.findAll().stream().allMatch(c -> c.getSenhaHash() != null));

        // Rodar de novo (reinicio do backend) nao duplica nada
        demo.popular();
        assertEquals(8, clientes.count());
        assertEquals(15, pedidos.count());
    }

    @Test
    void criaOFinanceiroDeSeisMesesEPagaSoOsPedidosAntigos() {
        var todos = lancamentos.findAll();
        long meses = todos.stream().map(l -> java.time.YearMonth.from(l.getData())).distinct().count();
        assertEquals(6, meses);
        for (var tipo : com.progest.Backend_api.model.TipoLancamento.values()) {
            assertTrue(todos.stream().anyMatch(l -> l.getTipo() == tipo), "sem lancamentos do tipo " + tipo);
        }
        assertTrue(todos.stream().noneMatch(l -> l.getData().isAfter(java.time.LocalDate.now())));

        // Os dois entregues mais antigos ja foram pagos; os demais seguem em aberto
        var pagos = pedidos.findAll().stream().filter(p -> p.getPagoEm() != null).toList();
        assertEquals(2, pagos.size());
        assertTrue(pagos.stream().allMatch(p -> p.getStatus() == StatusPedidoCliente.ENTREGUE));

        int total = todos.size();
        financeiro.popular();
        assertEquals(total, lancamentos.count());
    }
}
