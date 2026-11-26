package com.progest.Backend_api;

import com.progest.Backend_api.config.ErpAuthInterceptor;
import com.progest.Backend_api.controller.ErpFinanceiroController;
import com.progest.Backend_api.controller.ErpFinanceiroController.PagamentoRequest;
import com.progest.Backend_api.dto.LancamentoDto;
import com.progest.Backend_api.dto.PedidoClienteRequest;
import com.progest.Backend_api.model.*;
import com.progest.Backend_api.repository.ClienteRepository;
import com.progest.Backend_api.services.PedidoClienteService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

// Financeiro do ERP: compras, saídas e contas a receber gravadas no banco
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:financeiro;DB_CLOSE_DELAY=-1")
@Transactional
class FinanceiroErpTests {

    @Autowired ErpFinanceiroController controller;
    @Autowired PedidoClienteService pedidos;
    @Autowired ClienteRepository clientes;

    private static final LocalDate HOJE = LocalDate.now();

    private static LancamentoDto compra(String material, long valor, StatusLancamento status) {
        return new LancamentoDto(null, TipoLancamento.COMPRA, HOJE, null, material, "Siderúrgica Teste",
                "3 bobinas", BigDecimal.valueOf(valor), status);
    }

    @Test
    void criaEditaEExcluiUmaCompra() {
        var criada = controller.criar(compra("Arame Fio 12", 1500, StatusLancamento.A_PAGAR));
        assertNotNull(criada.id());

        var paga = controller.atualizar(criada.id(), new LancamentoDto(null, TipoLancamento.COMPRA, HOJE, null,
                "Arame Fio 12", "Siderúrgica Teste", "3 bobinas", new BigDecimal("1550.5"), StatusLancamento.PAGO));
        assertEquals(StatusLancamento.PAGO, paga.status());
        assertEquals(new BigDecimal("1550.50"), paga.valor());

        List<LancamentoDto> doMes = controller.listar(HOJE.withDayOfMonth(1), HOJE);
        assertTrue(doMes.stream().anyMatch(l -> l.id().equals(criada.id()) && l.status() == StatusLancamento.PAGO));

        controller.excluir(criada.id());
        assertTrue(controller.listar(HOJE.withDayOfMonth(1), HOJE).stream().noneMatch(l -> l.id().equals(criada.id())));
    }

    @Test
    void despesaPrecisaDeCategoriaEValorPositivo() {
        var semCategoria = new LancamentoDto(null, TipoLancamento.DESPESA, HOJE, null, "Energia", "Distribuidora",
                null, BigDecimal.TEN, StatusLancamento.A_PAGAR);
        assertEquals(HttpStatus.BAD_REQUEST,
                assertThrows(ResponseStatusException.class, () -> controller.criar(semCategoria)).getStatusCode());

        var zerada = new LancamentoDto(null, TipoLancamento.DESPESA, HOJE, CategoriaDespesa.ENERGIA, "Energia",
                "Distribuidora", null, BigDecimal.ZERO, StatusLancamento.A_PAGAR);
        assertEquals(HttpStatus.BAD_REQUEST,
                assertThrows(ResponseStatusException.class, () -> controller.criar(zerada)).getStatusCode());

        var ok = controller.criar(new LancamentoDto(null, TipoLancamento.DESPESA, HOJE, CategoriaDespesa.ALUGUEL,
                "Aluguel do galpão", "Imobiliária", "ignorado", new BigDecimal("9500"), StatusLancamento.PAGO));
        assertEquals(CategoriaDespesa.ALUGUEL, ok.categoria());
        assertNull(ok.quantidade());
    }

    @Test
    void pagamentoDoPedidoSoDepoisDeAprovadoEComEstorno() {
        Cliente cli = clientes.save(new Cliente("52998224725", "15999990000", "Maria", "maria@teste.com"));
        PedidoCliente p = pedidos.criar(cli, new PedidoClienteRequest("FIO_12", "MALHA_2", "GALVANIZADA",
                new BigDecimal("2.00"), new BigDecimal("30"), false, null));

        var naoAprovado = assertThrows(ResponseStatusException.class,
                () -> controller.registrarPagamento(p.getId(), new PagamentoRequest(HOJE, FormaPagamento.PIX)));
        assertEquals(HttpStatus.CONFLICT, naoAprovado.getStatusCode());

        pedidos.aprovar(List.of(p.getId()));

        var futuro = assertThrows(ResponseStatusException.class,
                () -> controller.registrarPagamento(p.getId(), new PagamentoRequest(HOJE.plusDays(3), FormaPagamento.PIX)));
        assertEquals(HttpStatus.BAD_REQUEST, futuro.getStatusCode());

        var pago = controller.registrarPagamento(p.getId(), new PagamentoRequest(HOJE, FormaPagamento.BOLETO));
        assertEquals(HOJE, pago.pagoEm());
        assertEquals(FormaPagamento.BOLETO, pago.formaPagamento());

        // Pedido pago não volta para a fila de aprovação sem estornar antes
        assertThrows(ResponseStatusException.class, () -> pedidos.voltarParaFila(p.getId()));

        var estornado = controller.estornarPagamento(p.getId());
        assertNull(estornado.pagoEm());
        assertNull(estornado.formaPagamento());
    }

    @Test
    void financeiroFicaSoParaOAdministrador() {
        assertTrue(ErpAuthInterceptor.podeAcessar(PerfilErp.ADMIN, "/api/erp/financeiro/lancamentos"));
        assertFalse(ErpAuthInterceptor.podeAcessar(PerfilErp.FUNCIONARIO, "/api/erp/financeiro/lancamentos"));
        assertFalse(ErpAuthInterceptor.podeAcessar(PerfilErp.FUNCIONARIO, "/api/erp/pedidos/1/pagamento"));
    }
}
