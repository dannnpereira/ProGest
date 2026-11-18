package com.progest.Backend_api;

import com.progest.Backend_api.dto.*;
import com.progest.Backend_api.model.CategoriaProduto;
import com.progest.Backend_api.model.UnidadeProduto;
import com.progest.Backend_api.services.ClienteService;
import com.progest.Backend_api.services.OrcamentoService;
import com.progest.Backend_api.services.ProdutoService;

import jakarta.validation.Validator;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

// Banco em memoria: os testes nao mexem no banco local (data/progest.mv.db)
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:testes;DB_CLOSE_DELAY=-1")
@Transactional
class CadastroEProdutosTests {

    @Autowired ClienteService clientes;
    @Autowired ProdutoService produtos;
    @Autowired OrcamentoService orcamento;
    @Autowired Validator validator;

    private static CadastroRequest cadastro(String cpf, String email) {
        return new CadastroRequest("Maria Teste", cpf, "(15) 99999-0000", email, "senha-forte-1");
    }

    // ---------- E-mail ----------

    @Test
    void aceitaEmailsDeQualquerProvedorEComEspacosNasPontas() {
        for (String email : new String[]{
                "maria@gmail.com", "joao.silva+obra@empresa.com.br", "contato@sub.dominio.net",
                "joão@exemplo.com.br", "  COM.ESPACO@Hotmail.com  "}) {
            assertTrue(validator.validate(cadastro("52998224725", email)).isEmpty(), email);
        }
        for (String email : new String[]{"sem-arroba.com", "maria@gmail", "ma ria@gmail.com"}) {
            assertFalse(validator.validate(cadastro("52998224725", email)).isEmpty(), email);
        }
    }

    @Test
    void salvaEmailSemEspacosEMinusculo() {
        var c = clientes.cadastrar(cadastro("529.982.247-25", "  Maria.Teste@Gmail.com "));
        assertEquals("maria.teste@gmail.com", c.getEmail());
        assertNotNull(clientes.autenticar(new LoginRequest(" MARIA.TESTE@gmail.com", "senha-forte-1")));
    }

    // ---------- Conta repetida ----------

    @Test
    void recusaCpfOuEmailQueJaTemConta() {
        clientes.cadastrar(cadastro("52998224725", "maria@gmail.com"));

        var cpfRepetido = assertThrows(ResponseStatusException.class,
                () -> clientes.cadastrar(cadastro("52998224725", "outra@gmail.com")));
        var emailRepetido = assertThrows(ResponseStatusException.class,
                () -> clientes.cadastrar(cadastro("11144477735", "MARIA@gmail.com")));
        var ambos = assertThrows(ResponseStatusException.class,
                () -> clientes.cadastrar(cadastro("52998224725", "maria@gmail.com")));

        assertEquals(HttpStatus.CONFLICT, cpfRepetido.getStatusCode());
        assertTrue(cpfRepetido.getReason().contains("CPF"));
        assertTrue(emailRepetido.getReason().contains("e-mail"));
        assertTrue(ambos.getReason().contains("CPF e este e-mail"));
    }

    @Test
    void disponibilidadeAvisaAntesDeEnviar() {
        clientes.cadastrar(cadastro("52998224725", "maria@gmail.com"));

        var r = clientes.disponibilidade(new DisponibilidadeRequest("529.982.247-25", " Maria@Gmail.com"));
        assertTrue(r.cpfEmUso());
        assertTrue(r.emailEmUso());

        var livre = clientes.disponibilidade(new DisponibilidadeRequest("11144477735", "nova@gmail.com"));
        assertFalse(livre.cpfEmUso());
        assertFalse(livre.emailEmUso());
    }

    @Test
    void clienteQueSoFezPedidoAindaPodeCriarConta() {
        clientes.adicionarCliente("52998224725", "15999990000", "Maria", "maria@gmail.com");

        var r = clientes.disponibilidade(new DisponibilidadeRequest("52998224725", "maria@gmail.com"));
        assertFalse(r.cpfEmUso());
        assertFalse(r.emailEmUso());

        var conta = clientes.cadastrar(cadastro("52998224725", "maria@gmail.com"));
        assertNotNull(conta.getSenhaHash());
    }

    // ---------- Orçamento calculado na API ----------

    private static OrcamentoRequest pedido50x2(String tratamento, boolean entrega, String cep) {
        return new OrcamentoRequest("FIO_12", "MALHA_3", tratamento,
                new BigDecimal("2"), new BigDecimal("50"), entrega, cep);
    }

    private static void igual(String esperado, BigDecimal valor) {
        assertEquals(0, new BigDecimal(esperado).compareTo(valor), "esperado " + esperado + ", veio " + valor);
    }

    @Test
    void calculaComOsValoresIniciaisIgualAoSiteFazia() {
        // 50 m x 2 m, Fio 12, Malha 3", galvanizada, retirada: o mesmo exemplo do protótipo
        var o = orcamento.calcular(pedido50x2("GALVANIZADA", false, null));
        igual("100.00", o.areaM2());
        igual("1800.00", o.materiaPrima());
        igual("175.00", o.acessorios());
        igual("0.00", o.frete().valor());
        igual("98.75", o.desconto());
        igual("1876.25", o.total());
        assertEquals(10, o.parcelas());
        igual("187.63", o.valorParcela());
    }

    @Test
    void freteEntraPelaFaixaDoCep() {
        // CEP de Itapetininga (182): 48 km -> 69,60 combustível + 36,00 pedágio + 50 taxa
        var o = orcamento.calcular(pedido50x2("PVC", true, "18200-000"));
        assertEquals(48, o.frete().distanciaKm());
        igual("155.60", o.frete().valor());
        igual("2200.00", o.materiaPrima()); // 100 m² x (18 + 0 + 4)

        var semCep = orcamento.calcular(pedido50x2("GALVANIZADA", true, ""));
        igual("150.00", semCep.frete().valor());
    }

    @Test
    void precoEditadoNoErpMudaOOrcamentoNaHora() {
        var fio12 = produtos.listar().stream().filter(p -> "FIO_12".equals(p.chave())).findFirst().orElseThrow();
        produtos.atualizar(fio12.id(), new ProdutoRequest(CategoriaProduto.ARAME, fio12.nome(), fio12.descricao(),
                UnidadeProduto.M2, new BigDecimal("21.90"), true));
        produtos.salvarRegras(new RegrasOrcamentoDto(new BigDecimal("8"), 12));

        var o = orcamento.calcular(pedido50x2("GALVANIZADA", false, null));
        igual("2190.00", o.materiaPrima());
        igual("189.20", o.desconto());
        igual("2175.80", o.total());
        assertEquals(12, o.parcelas());
        igual("181.32", o.valorParcela());
    }

    @Test
    void produtoDesativadoNoErpNaoPodeSerOrcado() {
        var pvc = produtos.listar().stream().filter(p -> "PVC".equals(p.chave())).findFirst().orElseThrow();
        produtos.atualizar(pvc.id(), new ProdutoRequest(pvc.categoria(), pvc.nome(), pvc.descricao(),
                pvc.unidade(), pvc.valor(), false));

        var erro = assertThrows(ResponseStatusException.class,
                () -> orcamento.calcular(pedido50x2("PVC", false, null)));
        assertEquals(422, erro.getStatusCode().value());
    }

    @Test
    void naoAceitaChaveDeOutraCategoria() {
        var req = new OrcamentoRequest("PVC", "MALHA_3", "GALVANIZADA", BigDecimal.ONE, BigDecimal.TEN, false, null);
        assertThrows(ResponseStatusException.class, () -> orcamento.calcular(req));
    }

    // ---------- Produtos novos e exclusão pelo ERP ----------

    private ProdutoResponse novo(CategoriaProduto categoria, String nome, String valor) {
        return produtos.criar(new ProdutoRequest(categoria, nome, "Cadastrado no ERP",
                UnidadeProduto.M2, new BigDecimal(valor), true));
    }

    private ProdutoResponse porChave(String chave) {
        return produtos.listar().stream().filter(p -> chave.equals(p.chave())).findFirst().orElseThrow();
    }

    @Test
    void produtoNovoDoErpApareceNoSiteEPodeSerOrcado() {
        var fio16 = novo(CategoriaProduto.ARAME, "Fio 16 (1,65 mm)", "10.00");
        assertEquals("PROD_" + fio16.id(), fio16.chave());
        assertTrue(produtos.catalogo().stream().anyMatch(i -> i.chave().equals(fio16.chave())));

        var o = orcamento.calcular(new OrcamentoRequest(fio16.chave(), "MALHA_3", "GALVANIZADA",
                new BigDecimal("2"), new BigDecimal("50"), false, null));
        igual("1000.00", o.materiaPrima()); // 100 m² x 10
    }

    @Test
    void produtoExcluidoSomeDoErpEDoSite() {
        var fio16 = novo(CategoriaProduto.ARAME, "Fio 16 (1,65 mm)", "10.00");
        produtos.excluir(fio16.id());

        assertTrue(produtos.listar().stream().noneMatch(p -> p.id().equals(fio16.id())));
        assertTrue(produtos.catalogo().stream().noneMatch(i -> i.chave().equals(fio16.chave())));
        var erro = assertThrows(ResponseStatusException.class, () -> orcamento.calcular(
                new OrcamentoRequest(fio16.chave(), "MALHA_3", "GALVANIZADA", BigDecimal.ONE, BigDecimal.TEN, false, null)));
        assertEquals(422, erro.getStatusCode().value());
    }

    @Test
    void naoDeixaOSiteSemNenhumaOpcaoDeUmaCategoria() {
        produtos.excluir(porChave("PVC").id());
        var galvanizada = porChave("GALVANIZADA");

        var erro = assertThrows(ResponseStatusException.class, () -> produtos.excluir(galvanizada.id()));
        assertEquals(HttpStatus.CONFLICT, erro.getStatusCode());
        assertThrows(ResponseStatusException.class, () -> produtos.atualizar(galvanizada.id(),
                new ProdutoRequest(galvanizada.categoria(), galvanizada.nome(), galvanizada.descricao(),
                        galvanizada.unidade(), galvanizada.valor(), false)));
    }

    @Test
    void todosOsAcessoriosAtivosEntramNoOrcamento() {
        produtos.criar(new ProdutoRequest(CategoriaProduto.ACESSORIOS, "Arame de amarração", null,
                UnidadeProduto.METRO_LINEAR, new BigDecimal("1.50"), true));
        var o = orcamento.calcular(pedido50x2("GALVANIZADA", false, null));
        igual("250.00", o.acessorios()); // 50 m x (3,50 + 1,50)
    }

    @Test
    void medidasZeradasSaoRecusadas() {
        var req = new OrcamentoRequest("FIO_12", "MALHA_3", "GALVANIZADA", BigDecimal.ZERO, BigDecimal.ZERO, false, null);
        assertFalse(validator.validate(req).isEmpty());
    }
}
