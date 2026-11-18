package com.progest.Backend_api;

import com.progest.Backend_api.config.ErpAuthInterceptor;
import com.progest.Backend_api.dto.*;
import com.progest.Backend_api.model.Cliente;
import com.progest.Backend_api.model.PerfilErp;
import com.progest.Backend_api.model.StatusPedidoCliente;
import com.progest.Backend_api.services.ClienteService;
import com.progest.Backend_api.services.PedidoClienteService;
import com.progest.Backend_api.services.SessaoClienteService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:pedidos;DB_CLOSE_DELAY=-1")
@Transactional
class PedidoClienteTests {

    @Autowired ClienteService clientes;
    @Autowired SessaoClienteService sessoes;
    @Autowired PedidoClienteService pedidos;

    private Cliente maria;

    @BeforeEach
    void preparar() {
        maria = clientes.cadastrar(new CadastroRequest("Maria Teste", "52998224725", "(15) 99999-0000",
                "maria@gmail.com", "senha-forte-1"));
    }

    private static PedidoClienteRequest retirada() {
        return new PedidoClienteRequest("FIO_12", "MALHA_3", "GALVANIZADA",
                new BigDecimal("2"), new BigDecimal("50"), false, null);
    }

    private static PedidoClienteRequest entrega() {
        return new PedidoClienteRequest("FIO_12", "MALHA_3", "PVC",
                new BigDecimal("2"), new BigDecimal("50"), true,
                new PedidoClienteRequest.Endereco("18200-000", "Rua das Flores", "109", "Galpão 2",
                        "Centro", "Itapetininga", "sp"));
    }

    // ---------- Sessão e perfil ----------

    @Test
    void loginDevolveTokenQueIdentificaOCliente() {
        var sessao = sessoes.entrar(maria);
        assertNotNull(sessao.token());
        assertEquals(maria.getId(), sessoes.clienteDoToken(sessao.token()).orElseThrow().getId());
        sessoes.sair(sessao.token());
        assertTrue(sessoes.clienteDoToken(sessao.token()).isEmpty());
    }

    @Test
    void perfilMostraCpfMascarado() {
        var perfil = PerfilResponse.de(maria);
        assertEquals("Maria Teste", perfil.nome());
        assertEquals("529.***.***-25", perfil.cpf());
        assertEquals("(15) 99999-0000", perfil.telefone());
    }

    // ---------- Criação ----------

    @Test
    void pedidoDeRetiradaUsaOPrecoDoServidor() {
        var p = pedidos.criar(maria, retirada());
        assertEquals("AM-" + (1000 + p.getId()), p.getCodigo());
        assertEquals(StatusPedidoCliente.AGUARDANDO_APROVACAO, p.getStatus());
        // Nome dos produtos gravado no pedido (continua certo se o ERP renomear/excluir)
        assertEquals("Fio 12 (2,77 mm)", p.getArameNome());
        assertEquals("Malha 3\" (75 mm)", p.getMalhaNome());
        assertEquals("Galvanizada a fogo", p.getTratamentoNome());
        assertEquals(0, new BigDecimal("1866.25").compareTo(p.getValorTotal()));
        assertEquals(0, BigDecimal.ZERO.compareTo(p.getValorFrete()));

        // O que o site recebe permite refazer a ficha técnica com os mesmos valores
        var r = PedidoClienteResponse.de(p);
        assertEquals(0, new BigDecimal("10.49").compareTo(r.descontoPct()));
        assertEquals(0, r.valorTotal().compareTo(r.valorMateriaPrima().add(r.valorAcessorios())
                .add(r.valorFrete()).subtract(r.valorDesconto())));
    }

    @Test
    void pedidoDeEntregaGuardaEnderecoEFrete() {
        var p = pedidos.criar(maria, entrega());
        assertEquals("Rua das Flores, nº 109 (Galpão 2) - Centro - Itapetininga/SP", p.getEndereco());
        assertEquals(48, p.getDistanciaKm());
        assertEquals(0, new BigDecimal("155.60").compareTo(p.getValorFrete()));

        var erp = PedidoErpResponse.de(p);
        assertEquals("CPF 529.982.247-25", erp.cliente().documento());
        assertEquals("Itapetininga", erp.cliente().cidade());
        assertEquals("4 rolos x 15m", erp.rolos());
        // total no ERP = material + frete = total do cliente
        assertEquals(0, p.getValorTotal().compareTo(erp.valorMaterial().add(erp.valorFrete())));
    }

    @Test
    void entregaSemEnderecoERecusada() {
        var semEndereco = new PedidoClienteRequest("FIO_12", "MALHA_3", "GALVANIZADA",
                BigDecimal.TEN, BigDecimal.TEN, true, null);
        assertThrows(ResponseStatusException.class, () -> pedidos.criar(maria, semEndereco));
    }

    @Test
    void clienteSoVeOsProprioPedidos() {
        Cliente joao = clientes.cadastrar(new CadastroRequest("João Teste", "11144477735", "(15) 98888-0000",
                "joao@gmail.com", "senha-forte-2"));
        pedidos.criar(maria, retirada());
        pedidos.criar(joao, retirada());
        assertEquals(1, pedidos.doCliente(maria).size());
        assertEquals(2, pedidos.todos().size());
    }

    // ---------- Aprovação e produção ----------

    @Test
    void fluxoCompletoAprovarProduzirEntregar() {
        var p = pedidos.criar(maria, entrega());
        var aprovado = pedidos.aprovar(List.of(p.getId())).get(0);
        assertEquals(StatusPedidoCliente.A_FAZER, aprovado.getStatus());
        assertNotNull(aprovado.getPrevisaoEntrega());

        assertEquals(StatusPedidoCliente.EM_PROCESSO, pedidos.avancar(p.getId()).getStatus());
        assertEquals(StatusPedidoCliente.ENTREGUE, pedidos.avancar(p.getId()).getStatus());
        assertThrows(ResponseStatusException.class, () -> pedidos.avancar(p.getId()));

        // Desfazer volta uma etapa
        assertEquals(StatusPedidoCliente.EM_PROCESSO, pedidos.voltarEtapa(p.getId()).getStatus());
    }

    @Test
    void naoPulaEtapasNemAprovaDuasVezes() {
        var p = pedidos.criar(maria, retirada());
        assertThrows(ResponseStatusException.class, () -> pedidos.avancar(p.getId())); // ainda não aprovado
        pedidos.aprovar(List.of(p.getId()));
        assertThrows(ResponseStatusException.class, () -> pedidos.aprovar(List.of(p.getId())));
        assertThrows(ResponseStatusException.class, () -> pedidos.recusar(p.getId(), "x"));
    }

    @Test
    void recusarEDesfazerVoltaParaAFila() {
        var p = pedidos.criar(maria, retirada());
        var recusado = pedidos.recusar(p.getId(), "  Medida fora do padrão ");
        assertEquals("Medida fora do padrão", recusado.getMotivoRecusa());
        var deVolta = pedidos.voltarParaFila(p.getId());
        assertEquals(StatusPedidoCliente.AGUARDANDO_APROVACAO, deVolta.getStatus());
        assertNull(deVolta.getMotivoRecusa());
    }

    @Test
    void funcionarioSoMexeNaProducao() {
        assertTrue(ErpAuthInterceptor.podeAcessar(PerfilErp.FUNCIONARIO, "/api/erp/producao/pedidos"));
        assertTrue(ErpAuthInterceptor.podeAcessar(PerfilErp.FUNCIONARIO, "/api/erp/producao/pedidos/5/avancar"));
        assertFalse(ErpAuthInterceptor.podeAcessar(PerfilErp.FUNCIONARIO, "/api/erp/pedidos"));
        assertFalse(ErpAuthInterceptor.podeAcessar(PerfilErp.FUNCIONARIO, "/api/erp/pedidos/aprovar"));
    }
}
