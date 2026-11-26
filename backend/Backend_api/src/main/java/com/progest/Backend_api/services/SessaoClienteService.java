package com.progest.Backend_api.services;

import com.progest.Backend_api.dto.ClienteResponse;
import com.progest.Backend_api.dto.SessaoClienteResponse;
import com.progest.Backend_api.model.Cliente;
import com.progest.Backend_api.repository.ClienteRepository;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Sessão do cliente do site (mesma ideia da sessão do ERP): no login/cadastro o servidor
 * gera um token aleatório e guarda em memória de qual cliente ele é. O site envia o token
 * nas chamadas para /api/conta/** (perfil e pedidos). Se o backend reiniciar, é preciso
 * entrar de novo.
 */
@Service
public class SessaoClienteService {

    public static final Duration DURACAO = Duration.ofDays(7);

    private final ClienteRepository clientes;
    private final SecureRandom random = new SecureRandom();
    private final Map<String, Sessao> sessoes = new ConcurrentHashMap<>();

    public SessaoClienteService(ClienteRepository clientes) {
        this.clientes = clientes;
    }

    public record Sessao(Long clienteId, Instant expiraEm) {
        boolean expirada() {
            return Instant.now().isAfter(expiraEm);
        }
    }

    /** Abre a sessão do cliente (após login ou cadastro) e devolve o token. */
    public SessaoClienteResponse entrar(Cliente cliente) {
        sessoes.values().removeIf(Sessao::expirada);
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Sessao sessao = new Sessao(cliente.getId(), Instant.now().plus(DURACAO));
        sessoes.put(token, sessao);
        return new SessaoClienteResponse(token, sessao.expiraEm(), ClienteResponse.de(cliente));
    }

    public Optional<Cliente> clienteDoToken(String token) {
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
        return clientes.findById(sessao.clienteId());
    }

    public void sair(String token) {
        if (token != null) {
            sessoes.remove(token);
        }
    }

    /** Encerra todas as sessões do cliente (ex.: depois de trocar a senha). */
    public void sairDoCliente(Long clienteId) {
        sessoes.values().removeIf(s -> s.clienteId().equals(clienteId));
    }
}
