package com.progest.Backend_api;

import com.progest.Backend_api.config.AdminInicial;
import com.progest.Backend_api.model.UsuarioErp;
import com.progest.Backend_api.repository.UsuarioErpRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:admin;DB_CLOSE_DELAY=-1")
class AdminInicialTests {

    @Autowired UsuarioErpRepository repo;
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    @BeforeEach
    void limpar() {
        repo.deleteAll();
    }

    private void iniciar(String email, String senha) {
        new AdminInicial(repo, email, "Administrador", senha).garantirAdmin();
    }

    private UsuarioErp buscar(String email) {
        return repo.findByEmailIgnoreCase(email).orElseThrow();
    }

    @Test
    void criaOAdministradorComOEmailConfigurado() throws Exception {
        iniciar("AmaralAlambrados109@gmail.com", "senha-de-teste-1");
        UsuarioErp admin = buscar("amaralalambrados109@gmail.com");
        assertEquals("amaralalambrados109@gmail.com", admin.getEmail());
        assertTrue(bcrypt.matches("senha-de-teste-1", admin.getSenhaHash()));
    }

    @Test
    void trocarAdminSenhaAtualizaASenhaAoReiniciar() throws Exception {
        iniciar("amaralalambrados109@gmail.com", "senha-de-teste-1");
        iniciar("amaralalambrados109@gmail.com", "senha-de-teste-2");
        assertEquals(1, repo.count());
        assertTrue(bcrypt.matches("senha-de-teste-2", buscar("amaralalambrados109@gmail.com").getSenhaHash()));
    }

    @Test
    void desativaOAdministradorDeExemploAntigo() throws Exception {
        repo.save(new UsuarioErp("Antigo", "admin@amaral.com.br", bcrypt.encode("amaral2026")));
        iniciar("amaralalambrados109@gmail.com", "senha-de-teste-1");
        assertFalse(buscar("admin@amaral.com.br").isAtivo());
        assertTrue(buscar("amaralalambrados109@gmail.com").isAtivo());
    }

    @Test
    void semSenhaNaoCriaNada() throws Exception {
        iniciar("amaralalambrados109@gmail.com", "");
        iniciar("amaralalambrados109@gmail.com", "curta");
        assertEquals(0, repo.count());
    }
}
