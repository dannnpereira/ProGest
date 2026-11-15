package com.progest.Backend_api.services;

import com.progest.Backend_api.dto.LoginRequest;
import com.progest.Backend_api.dto.SessaoErpResponse;
import com.progest.Backend_api.dto.UsuarioErpResponse;
import com.progest.Backend_api.model.UsuarioErp;
import com.progest.Backend_api.repository.UsuarioErpRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Login do painel de gestao (ERP).
 *
 * Seguranca basica, sem JWT: no login o servidor gera um token aleatorio e guarda
 * em memoria qual usuario ele representa. O ERP manda esse token em toda chamada
 * para /api/erp/** (ver ErpAuthInterceptor). Se o backend reiniciar, as sessoes
 * acabam e e preciso entrar de novo.
 */
@Service
public class SessaoErpService {

    public static final Duration DURACAO = Duration.ofHours(12);

    private static final String MENSAGEM_LOGIN_INVALIDO = "E-mail ou senha incorretos.";

    private final UsuarioErpRepository repository;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();
    private final Map<String, Sessao> sessoes = new ConcurrentHashMap<>();

    // Hash usado quando o e-mail nao existe, para a resposta demorar o mesmo tempo
    // e nao entregar quais e-mails estao cadastrados
    private final String hashFalso;

    public SessaoErpService(UsuarioErpRepository repository) {
        this.repository = repository;
        this.hashFalso = passwordEncoder.encode("senha-que-nao-existe");
    }

    public record Sessao(Long usuarioId, Instant expiraEm) {
        boolean expirada() {
            return Instant.now().isAfter(expiraEm);
        }
    }

    public SessaoErpResponse entrar(LoginRequest req) {
        Optional<UsuarioErp> usuario = repository.findByEmailIgnoreCase(req.email().trim());

        boolean senhaConfere = passwordEncoder.matches(
                req.senha(), usuario.map(UsuarioErp::getSenhaHash).orElse(hashFalso));

        if (usuario.isEmpty() || !senhaConfere) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, MENSAGEM_LOGIN_INVALIDO);
        }
        if (!usuario.get().isAtivo()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Este acesso foi desativado.");
        }

        removerExpiradas();
        String token = novoToken();
        Sessao sessao = new Sessao(usuario.get().getId(), Instant.now().plus(DURACAO));
        sessoes.put(token, sessao);

        return new SessaoErpResponse(token, sessao.expiraEm(), UsuarioErpResponse.de(usuario.get()));
    }

    /** Usuario dono do token, se a sessao ainda vale e o usuario continua ativo. */
    public Optional<UsuarioErp> usuarioDoToken(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        Sessao sessao = sessoes.get(token);
        if (sessao == null) {
            return Optional.empty();
        }
        if (sessao.expirada()) {
            sessoes.remove(token);
            return Optional.empty();
        }
        return repository.findById(sessao.usuarioId()).filter(UsuarioErp::isAtivo);
    }

    public void sair(String token) {
        if (token != null) {
            sessoes.remove(token);
        }
    }

    private String novoToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private void removerExpiradas() {
        sessoes.values().removeIf(Sessao::expirada);
    }
}
