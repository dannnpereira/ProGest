package com.progest.Backend_api;

import com.progest.Backend_api.dto.*;
import com.progest.Backend_api.model.CategoriaProduto;
import com.progest.Backend_api.model.UnidadePreco;
import com.progest.Backend_api.model.UnidadeProduto;
import com.progest.Backend_api.services.CatalogoService;
import com.progest.Backend_api.services.ClienteService;
import com.progest.Backend_api.services.OrcamentoService;
import com.progest.Backend_api.services.PrecoTelaService;
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
    @Autowired PrecoTelaService precos;
    @Autowired CatalogoService catalogo;
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
    void calculaPelaTabelaDePrecos() {
        // 50 m x 2 m, Fio 12, Malha 3", galvanizada (17,00 a vista / 19,10 a prazo), retirada
        var o = orcamento.calcular(pedido50x2("GALVANIZADA", false, null));
        igual("100.00", o.areaM2());
        igual("1910.00", o.materiaPrima());      // 100 m2 x 19,10 (a prazo)
        igual("175.00", o.acessorios());         // 50 m x 3,50
        igual("0.00", o.frete().valor());
        igual("218.75", o.desconto());           // 100 x (19,10 - 17,00) + 5% de 175
        igual("1866.25", o.total());             // a vista
        igual("10.49", o.descontoPct());
        assertEquals(10, o.parcelas());
        igual("208.50", o.valorParcela());       // (1910 + 175) / 10, a prazo
    }

    @Test
    void freteEntraPelaFaixaDoCep() {
        // CEP de Itapetininga (182): 48 km -> 69,60 combustível + 36,00 pedágio + 50 taxa
        var o = orcamento.calcular(pedido50x2("PVC", true, "18200-000"));
        assertEquals(48, o.frete().distanciaKm());
        igual("155.60", o.frete().valor());
        igual("3414.00", o.materiaPrima()); // 100 m2 x 34,14 (plastificada, a prazo)

        var semCep = orcamento.calcular(pedido50x2("GALVANIZADA", true, ""));
        igual("150.00", semCep.frete().valor());
    }

    private PrecoTelaResponse tela(String arame, String malha, String tratamento) {
        return precos.listar().stream().filter(p -> p.unidade() == UnidadePreco.M2 && p.arame().equals(arame)
                && malha.equals(p.malha()) && p.tratamento().equals(tratamento)).findFirst().orElseThrow();
    }

    @Test
    void precoEditadoNoErpMudaOOrcamentoNaHora() {
        var t = tela("FIO_12", "MALHA_3", "GALVANIZADA");
        precos.atualizar(t.id(), new PrecoTelaRequest(t.arame(), t.malha(), t.tratamento(), UnidadePreco.M2,
                t.pesoKgM2(), new BigDecimal("18.00"), new BigDecimal("20.00")));
        produtos.salvarRegras(new RegrasOrcamentoDto(new BigDecimal("8"), 12));

        var o = orcamento.calcular(pedido50x2("GALVANIZADA", false, null));
        igual("2000.00", o.materiaPrima());
        igual("214.00", o.desconto());       // 100 x 2,00 + 8% de 175
        igual("1961.00", o.total());
        assertEquals(12, o.parcelas());
        igual("181.25", o.valorParcela());   // 2175 / 12
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

    private boolean noSite(String chave) {
        return catalogo.itens().stream().anyMatch(i -> i.chave().equals(chave));
    }

    private PrecoTelaResponse precoFio20(String chave) {
        return precos.criar(new PrecoTelaRequest(chave, "MALHA_3", "GALVANIZADA", UnidadePreco.M2,
                new BigDecimal("0.500"), new BigDecimal("10.00"), new BigDecimal("12.00")));
    }

    @Test
    void produtoNovoSoApareceNoSiteComPrecoNaTabela() {
        var fio20 = novo(CategoriaProduto.ARAME, "Fio 20 (0,89 mm)", "0.00");
        assertEquals("PROD_" + fio20.id(), fio20.chave());
        assertFalse(noSite(fio20.chave()));   // sem preco: nao vira opcao

        precoFio20(fio20.chave());
        assertTrue(noSite(fio20.chave()));
        assertTrue(catalogo.combinacoes().stream().anyMatch(c -> c.arame().equals(fio20.chave())));

        var o = orcamento.calcular(new OrcamentoRequest(fio20.chave(), "MALHA_3", "GALVANIZADA",
                new BigDecimal("2"), new BigDecimal("50"), false, null));
        igual("1200.00", o.materiaPrima()); // 100 m2 x 12,00
    }

    @Test
    void produtoExcluidoSomeDoErpEDoSite() {
        var fio20 = novo(CategoriaProduto.ARAME, "Fio 20 (0,89 mm)", "0.00");
        precoFio20(fio20.chave());
        produtos.excluir(fio20.id());

        assertTrue(produtos.listar().stream().noneMatch(p -> p.id().equals(fio20.id())));
        assertFalse(noSite(fio20.chave()));
        var erro = assertThrows(ResponseStatusException.class, () -> orcamento.calcular(
                new OrcamentoRequest(fio20.chave(), "MALHA_3", "GALVANIZADA", BigDecimal.ONE, BigDecimal.TEN, false, null)));
        assertEquals(422, erro.getStatusCode().value());
    }

    @Test
    void naoDeixaOSiteSemNenhumaTela() {
        produtos.excluir(porChave("PVC").id());
        produtos.excluir(porChave("PVC_PRETO").id());
        var galvanizada = porChave("GALVANIZADA");

        var erro = assertThrows(ResponseStatusException.class, () -> produtos.excluir(galvanizada.id()));
        assertEquals(HttpStatus.CONFLICT, erro.getStatusCode());
        assertThrows(ResponseStatusException.class, () -> produtos.atualizar(galvanizada.id(),
                new ProdutoRequest(galvanizada.categoria(), galvanizada.nome(), galvanizada.descricao(),
                        galvanizada.unidade(), galvanizada.valor(), false)));
    }

    // ---------- Tabela de precos ----------

    @Test
    void tabelasIniciaisEstaoCadastradas() {
        var lista = precos.listar();
        assertEquals(30, lista.size());
        assertEquals(23, lista.stream().filter(p -> p.unidade() == UnidadePreco.M2).count());
        var t = tela("FIO_14", "MALHA_2", "PVC_PRETO");
        igual("38.00", t.valorVista());
        igual("41.80", t.valorPrazo());
        // Fio 18 so tem preco por kg: nao e opcao de tela no site
        assertFalse(noSite("FIO_18"));
        assertTrue(noSite("FIO_16"));
    }

    @Test
    void siteSoOfereceCombinacoesComPreco() {
        // Fio 16 so existe com malha 3/4" e 1" galvanizada
        var doFio16 = catalogo.combinacoes().stream().filter(c -> c.arame().equals("FIO_16")).toList();
        assertEquals(2, doFio16.size());
        assertThrows(ResponseStatusException.class, () -> orcamento.calcular(
                new OrcamentoRequest("FIO_16", "MALHA_3", "GALVANIZADA", BigDecimal.ONE, BigDecimal.TEN, false, null)));
    }

    @Test
    void naoAceitaPrecoRepetidoNemTelaSemMalha() {
        var repetido = assertThrows(ResponseStatusException.class, () -> precos.criar(new PrecoTelaRequest(
                "FIO_12", "MALHA_3", "GALVANIZADA", UnidadePreco.M2, null, BigDecimal.ONE, null)));
        assertEquals(HttpStatus.CONFLICT, repetido.getStatusCode());

        var semMalha = assertThrows(ResponseStatusException.class, () -> precos.criar(new PrecoTelaRequest(
                "FIO_16", null, "PVC_PRETO", UnidadePreco.M2, null, BigDecimal.ONE, null)));
        assertEquals(422, semMalha.getStatusCode().value());
    }

    @Test
    void precoExcluidoSaiDoSite() {
        var t = tela("FIO_12", "MALHA_3", "PVC_PRETO");
        precos.excluir(t.id());
        assertTrue(catalogo.combinacoes().stream().noneMatch(c ->
                c.arame().equals("FIO_12") && c.malha().equals("MALHA_3") && c.tratamento().equals("PVC_PRETO")));
        assertThrows(ResponseStatusException.class, () -> orcamento.calcular(
                new OrcamentoRequest("FIO_12", "MALHA_3", "PVC_PRETO", BigDecimal.ONE, BigDecimal.TEN, false, null)));
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
