package com.progest.Backend_api;

import com.progest.Backend_api.config.AdminInicial;
import com.progest.Backend_api.config.ErpAuthInterceptor;
import com.progest.Backend_api.model.PerfilErp;
import com.progest.Backend_api.model.UsuarioErp;
import com.progest.Backend_api.repository.UsuarioErpRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:perfis;DB_CLOSE_DELAY=-1")
class PerfilFuncionarioTests {

    @Autowired UsuarioErpRepository repo;
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    @BeforeEach
    void limpar() {
        repo.deleteAll();
    }

    private void iniciar(String funcEmail, String funcSenha) {
        new AdminInicial(repo, "admin@teste.com", "Admin", "senha-admin-1",
                funcEmail, "Funcionário Teste", funcSenha).garantirAdmin();
    }

    @Test
    void criaFuncionarioComPerfilFuncionario() {
        iniciar("Func@Teste.com", "senha-func-1");
        UsuarioErp f = repo.findByEmailIgnoreCase("func@teste.com").orElseThrow();
        assertEquals(PerfilErp.FUNCIONARIO, f.getPerfil());
        assertTrue(bcrypt.matches("senha-func-1", f.getSenhaHash()));
        assertEquals(PerfilErp.ADMIN, repo.findByEmailIgnoreCase("admin@teste.com").orElseThrow().getPerfil());
    }

    @Test
    void semEmailDeFuncionarioSoCriaOAdmin() {
        iniciar("", "");
        assertEquals(1, repo.count());
    }

    @Test
    void funcionarioComMesmoEmailDoAdminEIgnorado() {
        iniciar("admin@teste.com", "senha-func-1");
        UsuarioErp u = repo.findByEmailIgnoreCase("admin@teste.com").orElseThrow();
        assertEquals(PerfilErp.ADMIN, u.getPerfil());
        assertTrue(bcrypt.matches("senha-admin-1", u.getSenhaHash()));
    }

    @Test
    void funcionarioSoAcessaSessaoEProducao() {
        assertTrue(ErpAuthInterceptor.podeAcessar(PerfilErp.FUNCIONARIO, "/api/erp/sessao"));
        assertTrue(ErpAuthInterceptor.podeAcessar(PerfilErp.FUNCIONARIO, "/api/erp/producao/pedidos"));
        assertFalse(ErpAuthInterceptor.podeAcessar(PerfilErp.FUNCIONARIO, "/api/erp/produtos"));
        assertFalse(ErpAuthInterceptor.podeAcessar(PerfilErp.FUNCIONARIO, "/api/erp/regras-orcamento"));
        assertFalse(ErpAuthInterceptor.podeAcessar(PerfilErp.FUNCIONARIO, "/api/erp/sessaoextra"));
        assertTrue(ErpAuthInterceptor.podeAcessar(PerfilErp.ADMIN, "/api/erp/produtos"));
    }
}
