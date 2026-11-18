package com.progest.Backend_api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Value;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Issue #118: as rotas de financeiro, clientes, pedidos antigos e workflow ficavam
 * abertas na internet. Agora exigem login do ERP, só de administrador.
 * Sobe o servidor de verdade para testar a configuração do interceptor.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:rotas;DB_CLOSE_DELAY=-1",
        "progest.admin.email=admin@teste.com",
        "progest.admin.senha=senha-admin-teste",
        "progest.funcionario.email=func@teste.com",
        "progest.funcionario.senha=senha-func-teste",
})
class RotasProtegidasTests {

    @Value("${local.server.port}") int porta;
    private final HttpClient http = HttpClient.newHttpClient();

    private HttpResponse<String> chamar(String metodo, String caminho, String token) throws Exception {
        var req = HttpRequest.newBuilder(URI.create("http://localhost:" + porta + caminho))
                .header("Content-Type", "application/json")
                .method(metodo, metodo.equals("GET") ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString("{}"));
        if (token != null) req.header("Authorization", "Bearer " + token);
        return http.send(req.build(), HttpResponse.BodyHandlers.ofString());
    }

    private String login(String email, String senha) throws Exception {
        var req = HttpRequest.newBuilder(URI.create("http://localhost:" + porta + "/api/auth/erp/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                        "{\"email\":\"" + email + "\",\"senha\":\"" + senha + "\"}")).build();
        String corpo = http.send(req, HttpResponse.BodyHandlers.ofString()).body();
        Matcher m = Pattern.compile("\"token\"\\s*:\\s*\"([^\"]+)\"").matcher(corpo);
        assertTrue(m.find(), "login falhou: " + corpo);
        return m.group(1);
    }

    private static final String[][] PROTEGIDAS = {
            {"GET", "/api/financeiro/resumo?ano=2026&mes=1"},
            {"GET", "/api/financeiro/transacoes"},
            {"POST", "/api/financeiro/entradas"},
            {"GET", "/api/clientes"},
            {"GET", "/api/clientes/id/1"},
            {"POST", "/api/clientes"},
            {"POST", "/api/pedidos"},
            {"PATCH", "/api/workflow/1/status"},
    };

    @Test
    void semLoginRecusaComo401() throws Exception {
        for (String[] r : PROTEGIDAS) {
            assertEquals(401, chamar(r[0], r[1], null).statusCode(), r[0] + " " + r[1]);
        }
    }

    @Test
    void funcionarioNaoAcessa() throws Exception {
        String token = login("func@teste.com", "senha-func-teste");
        for (String[] r : PROTEGIDAS) {
            assertEquals(403, chamar(r[0], r[1], token).statusCode(), r[0] + " " + r[1]);
        }
    }

    @Test
    void administradorAcessa() throws Exception {
        String token = login("admin@teste.com", "senha-admin-teste");
        assertEquals(200, chamar("GET", "/api/clientes", token).statusCode());
        assertEquals(200, chamar("GET", "/api/financeiro/transacoes", token).statusCode());
    }

    @Test
    void rotasDoSiteContinuamAbertas() throws Exception {
        assertEquals(200, chamar("GET", "/api/saude", null).statusCode());
        assertEquals(200, chamar("GET", "/api/catalogo", null).statusCode());
        assertEquals(200, chamar("GET", "/api/catalogo/combinacoes", null).statusCode());
        assertNotEquals(401, chamar("POST", "/api/orcamento", null).statusCode());
        assertNotEquals(401, chamar("POST", "/api/auth/disponibilidade", null).statusCode());
    }
}
