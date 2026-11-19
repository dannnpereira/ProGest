package com.progest.Backend_api;

import com.progest.Backend_api.config.ErpAuthInterceptor;
import com.progest.Backend_api.controller.ErpClientesController;
import com.progest.Backend_api.dto.BuscaCpfRequest;
import com.progest.Backend_api.dto.CadastroRequest;
import com.progest.Backend_api.dto.LoginRequest;
import com.progest.Backend_api.model.PerfilErp;
import com.progest.Backend_api.services.ClienteService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;

// Tela "Novo orcamento" do ERP: buscar cliente pelo CPF e criar a conta dele
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:erpclientes;DB_CLOSE_DELAY=-1")
@Transactional
class ErpClientesTests {

    @Autowired ErpClientesController controller;
    @Autowired ClienteService clientes;

    private static CadastroRequest cadastro(String cpf, String email) {
        return new CadastroRequest("Maria Teste", cpf, "(15) 99999-0000", email, "senha-forte-1");
    }

    @Test
    void criaContaPeloErpEOClienteConsegueEntrarNoSite() {
        var c = controller.cadastrar(cadastro("529.982.247-25", " Maria@Gmail.com "));
        assertEquals("52998224725", c.cpf());
        assertEquals("maria@gmail.com", c.email());
        assertTrue(c.temConta());
        assertNotNull(clientes.autenticar(new LoginRequest("maria@gmail.com", "senha-forte-1")));
    }

    @Test
    void buscaPeloCpfComOuSemPontuacao() {
        controller.cadastrar(cadastro("52998224725", "maria@gmail.com"));

        var achado = controller.buscarPorCpf(new BuscaCpfRequest("529.982.247-25"));
        assertEquals("Maria Teste", achado.nome());
        assertEquals("(15) 99999-0000", achado.telefone());
        assertTrue(achado.temConta());
    }

    @Test
    void cpfSemCadastroDa404ECpfInvalidoDa400() {
        var semCadastro = assertThrows(ResponseStatusException.class,
                () -> controller.buscarPorCpf(new BuscaCpfRequest("111.444.777-35")));
        assertEquals(HttpStatus.NOT_FOUND, semCadastro.getStatusCode());

        var invalido = assertThrows(ResponseStatusException.class,
                () -> controller.buscarPorCpf(new BuscaCpfRequest("123.456.789-00")));
        assertEquals(HttpStatus.BAD_REQUEST, invalido.getStatusCode());
    }

    @Test
    void clienteQueSoFezPedidoApareceSemContaEPodeGanharUma() {
        clientes.adicionarCliente("52998224725", "15999990000", "Maria", "maria@gmail.com");
        assertFalse(controller.buscarPorCpf(new BuscaCpfRequest("52998224725")).temConta());

        var conta = controller.cadastrar(cadastro("52998224725", "maria@gmail.com"));
        assertTrue(conta.temConta());
    }

    @Test
    void contaRepetidaAvisaComMensagemDoErp() {
        controller.cadastrar(cadastro("52998224725", "maria@gmail.com"));

        var cpf = assertThrows(ResponseStatusException.class,
                () -> controller.cadastrar(cadastro("52998224725", "outra@gmail.com")));
        assertEquals(HttpStatus.CONFLICT, cpf.getStatusCode());
        assertTrue(cpf.getReason().contains("busca por CPF"));

        var email = assertThrows(ResponseStatusException.class,
                () -> controller.cadastrar(cadastro("11144477735", "maria@gmail.com")));
        assertTrue(email.getReason().contains("e-mail"));
    }

    @Test
    void soOAdministradorAcessa() {
        assertTrue(ErpAuthInterceptor.podeAcessar(PerfilErp.ADMIN, "/api/erp/clientes/busca"));
        assertFalse(ErpAuthInterceptor.podeAcessar(PerfilErp.FUNCIONARIO, "/api/erp/clientes/busca"));
        assertFalse(ErpAuthInterceptor.podeAcessar(PerfilErp.FUNCIONARIO, "/api/erp/clientes"));
    }
}
