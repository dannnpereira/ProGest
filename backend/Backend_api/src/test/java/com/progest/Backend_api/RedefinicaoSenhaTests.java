package com.progest.Backend_api;

import com.jayway.jsonpath.JsonPath;
import com.progest.Backend_api.config.AdminInicial;
import com.progest.Backend_api.dto.LoginRequest;
import com.progest.Backend_api.repository.UsuarioErpRepository;
import com.progest.Backend_api.services.ClienteService;
import com.progest.Backend_api.services.EmailService;
import com.progest.Backend_api.services.SessaoErpService;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// "Esqueceu a senha?" do site e link de nova senha gerado pelo ERP
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:redefinicaosenha;DB_CLOSE_DELAY=-1",
        "progest.site.url=https://site.teste/",
})
@AutoConfigureMockMvc
@Transactional
class RedefinicaoSenhaTests {

    private static final String EMAIL = "maria@teste.com.br";
    private static final String SENHA_ANTIGA = "senha-antiga-1";
    private static final String SENHA_NOVA = "senha-nova-123";

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager em;
    @Autowired ClienteService clientes;
    @Autowired UsuarioErpRepository usuarios;
    @Autowired SessaoErpService sessoesErp;
    @MockitoBean EmailService email;

    private String tokenSessao;
    private long clienteId;

    @BeforeEach
    void cadastrarCliente() throws Exception {
        String corpo = """
                {"nome":"Maria Teste","cpf":"529.982.247-25","telefone":"(15) 99999-0000",
                 "email":"%s","senha":"%s"}""".formatted(EMAIL, SENHA_ANTIGA);
        String sessao = corpo(postar("/api/auth/cadastro", corpo).andExpect(status().isCreated()));
        tokenSessao = JsonPath.read(sessao, "$.token");
        clienteId = ((Number) JsonPath.read(sessao, "$.usuario.id")).longValue();
    }

    // ---------- Site: "Esqueceu a senha?" ----------

    @Test
    void respondeIgualComOuSemContaESoMandaEmailParaQuemTemConta() throws Exception {
        postar("/api/auth/esqueci-senha", "{\"email\":\"ninguem@teste.com\"}").andExpect(status().isAccepted());
        postar("/api/auth/esqueci-senha", "{\"email\":\"  MARIA@teste.com.br \"}").andExpect(status().isAccepted());

        verify(email, timeout(2000)).enviarLinkDeSenha(eq(EMAIL), eq("Maria Teste"), anyString(), eq(30L));
        verify(email, after(200).times(1)).enviarLinkDeSenha(anyString(), anyString(), anyString(), anyLong());
    }

    @Test
    void clienteSemContaNoSiteNaoRecebeEmail() throws Exception {
        clientes.adicionarCliente("11144477735", "15988887777", "Só Pedido", "sopedido@teste.com");

        postar("/api/auth/esqueci-senha", "{\"email\":\"sopedido@teste.com\"}").andExpect(status().isAccepted());

        verify(email, after(300).never()).enviarLinkDeSenha(anyString(), anyString(), anyString(), anyLong());
    }

    @Test
    void linkDoEmailTrocaASenhaEsoPodeSerUsadoUmaVez() throws Exception {
        String token = tokenDoEmail();
        String validar = "{\"token\":\"%s\"}".formatted(token);

        postar("/api/auth/redefinir-senha/validar", validar).andExpect(status().isNoContent());
        redefinir(token, SENHA_NOVA).andExpect(status().isNoContent());

        // Senha nova entra, a antiga não
        postar("/api/auth/login", login(SENHA_NOVA)).andExpect(status().isOk());
        postar("/api/auth/login", login(SENHA_ANTIGA)).andExpect(status().isUnauthorized());

        // O mesmo link não vale de novo
        postar("/api/auth/redefinir-senha/validar", validar).andExpect(status().isBadRequest());
        redefinir(token, "outra-senha-99").andExpect(status().isBadRequest());
    }

    @Test
    void trocarASenhaEncerraAsSessoesAbertas() throws Exception {
        mvc.perform(get("/api/conta").header("Authorization", "Bearer " + tokenSessao)).andExpect(status().isOk());

        redefinir(tokenDoEmail(), SENHA_NOVA).andExpect(status().isNoContent());

        mvc.perform(get("/api/conta").header("Authorization", "Bearer " + tokenSessao))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void linkVencidoNaoVale() throws Exception {
        String token = tokenDoEmail();
        em.flush();
        jdbc.update("UPDATE redefinicoes_senha SET expira_em = DATEADD('MINUTE', -1, CURRENT_TIMESTAMP)");
        em.clear(); // o JPA passa a ler a data vencida do banco

        redefinir(token, SENHA_NOVA).andExpect(status().isBadRequest());
        postar("/api/auth/login", login(SENHA_ANTIGA)).andExpect(status().isOk());
    }

    @Test
    void pedirDeNovoCancelaOLinkAnterior() throws Exception {
        String primeiro = tokenDoEmail();
        reset(email);
        String segundo = tokenDoEmail();

        redefinir(primeiro, SENHA_NOVA).andExpect(status().isBadRequest());
        redefinir(segundo, SENHA_NOVA).andExpect(status().isNoContent());
    }

    @Test
    void limitaOsEmailsPorClienteParaEvitarAbuso() throws Exception {
        for (int i = 0; i < 5; i++) {
            postar("/api/auth/esqueci-senha", "{\"email\":\"" + EMAIL + "\"}").andExpect(status().isAccepted());
        }
        verify(email, after(500).times(3)).enviarLinkDeSenha(anyString(), anyString(), anyString(), anyLong());
    }

    @Test
    void senhaNovaSegueAMesmaRegraDoCadastro() throws Exception {
        String token = tokenDoEmail();
        redefinir(token, "curta").andExpect(status().isBadRequest());
        redefinir(token, "x".repeat(73)).andExpect(status().isBadRequest());
        // O link continua valendo depois de uma senha recusada
        redefinir(token, SENHA_NOVA).andExpect(status().isNoContent());
    }

    @Test
    void tokenInventadoOuVazioERecusado() throws Exception {
        redefinir("token-inventado", SENHA_NOVA).andExpect(status().isBadRequest());
        postar("/api/auth/redefinir-senha/validar", "{\"token\":\"\"}").andExpect(status().isBadRequest());
    }

    @Test
    void bancoGuardaSoOHashDoToken() throws Exception {
        String token = tokenDoEmail();
        String guardado = jdbc.queryForObject("SELECT token_hash FROM redefinicoes_senha WHERE usado_em IS NULL", String.class);

        assertNotEquals(token, guardado);
        assertEquals(sha256(token), guardado);
    }

    // ---------- ERP: link gerado pelo administrador ----------

    @Test
    void erpGeraLinkSoParaOAdministrador() throws Exception {
        usuarios.deleteAll();
        new AdminInicial(usuarios, "admin@teste.com", "Admin", "senha-admin-1",
                "func@teste.com", "Funcionário", "senha-func-1").garantirAdmin();
        String admin = "Bearer " + sessoesErp.entrar(new LoginRequest("admin@teste.com", "senha-admin-1")).token();
        String funcionario = "Bearer " + sessoesErp.entrar(new LoginRequest("func@teste.com", "senha-func-1")).token();
        String rota = "/api/erp/clientes/" + clienteId + "/link-senha";

        mvc.perform(post(rota)).andExpect(status().isUnauthorized());
        mvc.perform(post(rota).header("Authorization", funcionario)).andExpect(status().isForbidden());

        String resposta = corpo(mvc.perform(post(rota).header("Authorization", admin))
                .andExpect(status().isCreated()));
        String link = JsonPath.read(resposta, "$.link");
        assertTrue(link.startsWith("https://site.teste/redefinir-senha?token="), link);
        assertNotNull(JsonPath.read(resposta, "$.expiraEm"));

        // O cliente usa o link do ERP normalmente
        redefinir(link.substring(link.indexOf("token=") + 6), SENHA_NOVA).andExpect(status().isNoContent());
        postar("/api/auth/login", login(SENHA_NOVA)).andExpect(status().isOk());

        // Cliente sem conta (só pedido) → 409; inexistente → 404
        long semConta = clientes.adicionarCliente("11144477735", "15988887777", "Só Pedido", "sopedido@teste.com").getId();
        mvc.perform(post("/api/erp/clientes/" + semConta + "/link-senha").header("Authorization", admin))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/erp/clientes/999999/link-senha").header("Authorization", admin))
                .andExpect(status().isNotFound());
    }

    // ---------- Apoio ----------

    /** Pede o link pelo site e devolve o token que iria no e-mail. */
    private String tokenDoEmail() throws Exception {
        postar("/api/auth/esqueci-senha", "{\"email\":\"" + EMAIL + "\"}").andExpect(status().isAccepted());
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(email, timeout(2000)).enviarLinkDeSenha(eq(EMAIL), anyString(), link.capture(), anyLong());
        String valor = link.getValue();
        assertTrue(valor.startsWith("https://site.teste/redefinir-senha?token="), valor);
        return valor.substring(valor.indexOf("token=") + 6);
    }

    private ResultActions redefinir(String token, String senha) throws Exception {
        return postar("/api/auth/redefinir-senha", "{\"token\":\"%s\",\"senha\":\"%s\"}".formatted(token, senha));
    }

    private static String login(String senha) {
        return "{\"email\":\"%s\",\"senha\":\"%s\"}".formatted(EMAIL, senha);
    }

    private ResultActions postar(String rota, String corpo) throws Exception {
        return mvc.perform(post(rota).contentType(MediaType.APPLICATION_JSON).content(corpo));
    }

    private static String corpo(ResultActions r) throws Exception {
        return r.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
    }

    private static String sha256(String texto) throws Exception {
        return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(texto.getBytes(StandardCharsets.UTF_8)));
    }
}
