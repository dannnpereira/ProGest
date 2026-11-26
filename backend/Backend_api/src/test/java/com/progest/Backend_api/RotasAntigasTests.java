package com.progest.Backend_api;

import com.progest.Backend_api.config.AdminInicial;
import com.progest.Backend_api.dto.LoginRequest;
import com.progest.Backend_api.repository.UsuarioErpRepository;
import com.progest.Backend_api.services.SessaoErpService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Rotas antigas (financeiro, clientes, pedidos, workflow): só o administrador do ERP
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:rotasantigas;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc
class RotasAntigasTests {

    @Autowired MockMvc mvc;
    @Autowired UsuarioErpRepository usuarios;
    @Autowired SessaoErpService sessoes;

    private String admin;
    private String funcionario;

    @BeforeEach
    void entrar() {
        usuarios.deleteAll();
        new AdminInicial(usuarios, "admin@teste.com", "Admin", "senha-admin-1",
                "func@teste.com", "Funcionário", "senha-func-1").garantirAdmin();
        admin = "Bearer " + sessoes.entrar(new LoginRequest("admin@teste.com", "senha-admin-1")).token();
        funcionario = "Bearer " + sessoes.entrar(new LoginRequest("func@teste.com", "senha-func-1")).token();
    }

    @Test
    void semLoginNadaPassa() throws Exception {
        mvc.perform(get("/api/clientes")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/clientes/id/1")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/clientes/buscar-ou-adicionar").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/financeiro/transacoes")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/financeiro/resumo")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/financeiro/despesas").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/workflow/1/status").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void funcionarioNaoAcessaEAdministradorSim() throws Exception {
        mvc.perform(get("/api/clientes").header("Authorization", funcionario)).andExpect(status().isForbidden());
        mvc.perform(get("/api/financeiro/transacoes").header("Authorization", funcionario)).andExpect(status().isForbidden());

        mvc.perform(get("/api/clientes").header("Authorization", admin)).andExpect(status().isOk());
        mvc.perform(get("/api/financeiro/transacoes").header("Authorization", admin)).andExpect(status().isOk());
    }

    @Test
    void rotasPublicasDoSiteContinuamAbertas() throws Exception {
        mvc.perform(get("/api/saude")).andExpect(status().isOk());
        mvc.perform(get("/api/catalogo")).andExpect(status().isOk());
    }
}
