package com.progest.Backend_api;

import com.progest.Backend_api.dto.LoginRequest;
import com.progest.Backend_api.dto.SessaoErpResponse;
import com.progest.Backend_api.model.UsuarioErp;
import com.progest.Backend_api.repository.UsuarioErpRepository;
import com.progest.Backend_api.services.SessaoErpService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class SessaoErpServiceTests {

    private UsuarioErpRepository repository;
    private SessaoErpService service;
    private UsuarioErp admin;

    @BeforeEach
    void preparar() {
        repository = mock(UsuarioErpRepository.class);
        service = new SessaoErpService(repository);

        admin = new UsuarioErp("Administrador", "admin@amaral.com.br", new BCryptPasswordEncoder().encode("senha-certa"));
        ReflectionTestUtils.setField(admin, "id", 1L);

        when(repository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(repository.findByEmailIgnoreCase("admin@amaral.com.br")).thenReturn(Optional.of(admin));
        when(repository.findById(1L)).thenReturn(Optional.of(admin));
    }

    @Test
    void loginCertoGeraTokenQueAbreASessao() {
        SessaoErpResponse resp = service.entrar(new LoginRequest("admin@amaral.com.br", "senha-certa"));

        assertNotNull(resp.token());
        assertEquals("Administrador", resp.usuario().nome());
        assertEquals(Optional.of(admin), service.usuarioDoToken(resp.token()));
    }

    @Test
    void senhaErradaOuEmailDesconhecidoDao401() {
        var senhaErrada = assertThrows(ResponseStatusException.class,
                () -> service.entrar(new LoginRequest("admin@amaral.com.br", "outra")));
        var emailDesconhecido = assertThrows(ResponseStatusException.class,
                () -> service.entrar(new LoginRequest("ninguem@amaral.com.br", "senha-certa")));

        assertEquals(HttpStatus.UNAUTHORIZED, senhaErrada.getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, emailDesconhecido.getStatusCode());
    }

    @Test
    void usuarioDesativadoNaoEntra() {
        admin.setAtivo(false);
        var erro = assertThrows(ResponseStatusException.class,
                () -> service.entrar(new LoginRequest("admin@amaral.com.br", "senha-certa")));
        assertEquals(HttpStatus.FORBIDDEN, erro.getStatusCode());
    }

    @Test
    void sairInvalidaOToken() {
        String token = service.entrar(new LoginRequest("admin@amaral.com.br", "senha-certa")).token();
        service.sair(token);
        assertTrue(service.usuarioDoToken(token).isEmpty());
    }

    @Test
    void tokenInventadoNaoVale() {
        assertTrue(service.usuarioDoToken("token-inventado").isEmpty());
        assertTrue(service.usuarioDoToken(null).isEmpty());
    }
}
