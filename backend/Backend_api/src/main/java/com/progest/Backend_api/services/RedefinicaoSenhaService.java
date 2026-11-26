package com.progest.Backend_api.services;

import com.progest.Backend_api.model.Cliente;
import com.progest.Backend_api.model.RedefinicaoSenha;
import com.progest.Backend_api.model.RedefinicaoSenha.Origem;
import com.progest.Backend_api.repository.ClienteRepository;
import com.progest.Backend_api.repository.RedefinicaoSenhaRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.concurrent.CompletableFuture;

/**
 * Recuperação de senha do cliente do site.
 *
 * <ul>
 *   <li><b>Site:</b> o cliente informa o e-mail em "Esqueceu a senha?" e recebe um link que vale
 *       30 minutos. A resposta é sempre a mesma, exista ou não a conta, para não revelar quem é cliente.</li>
 *   <li><b>ERP:</b> o administrador gera o link para mandar ao cliente (ex.: pelo WhatsApp),
 *       válido por 24 horas. Funciona mesmo sem o envio de e-mail configurado.</li>
 * </ul>
 *
 * O link é de uso único; gerar um novo cancela os anteriores. Ao trocar a senha, todas as
 * sessões abertas do cliente são encerradas.
 */
@Service
public class RedefinicaoSenhaService {

    public static final Duration VALIDADE_SITE = Duration.ofMinutes(30);
    public static final Duration VALIDADE_ERP = Duration.ofHours(24);
    /** No máximo 3 e-mails por cliente a cada 15 minutos */
    static final int LIMITE_PEDIDOS = 3;
    static final Duration JANELA_LIMITE = Duration.ofMinutes(15);

    public static final String LINK_INVALIDO =
            "Este link não vale mais: ele já foi usado, venceu ou foi substituído por outro. Peça um novo.";

    public record LinkGerado(String link, Instant expiraEm) {
    }

    private final ClienteRepository clientes;
    private final RedefinicaoSenhaRepository redefinicoes;
    private final ClienteService clienteService;
    private final SessaoClienteService sessoes;
    private final EmailService email;
    private final String siteUrl;
    private final SecureRandom random = new SecureRandom();

    public RedefinicaoSenhaService(ClienteRepository clientes,
                                   RedefinicaoSenhaRepository redefinicoes,
                                   ClienteService clienteService,
                                   SessaoClienteService sessoes,
                                   EmailService email,
                                   @Value("${progest.site.url:http://localhost:4200}") String siteUrl) {
        this.clientes = clientes;
        this.redefinicoes = redefinicoes;
        this.clienteService = clienteService;
        this.sessoes = sessoes;
        this.email = email;
        this.siteUrl = siteUrl.replaceAll("/+$", "");
    }

    /**
     * "Esqueceu a senha?" do site. Não diz se o e-mail existe: sem conta, não faz nada.
     * O e-mail sai em segundo plano para a resposta levar o mesmo tempo nos dois casos.
     */
    @Transactional
    public void solicitarPeloSite(String emailInformado) {
        String emailNormal = emailInformado == null ? "" : emailInformado.trim().toLowerCase();
        Cliente cliente = clientes.findByEmailIgnoreCase(emailNormal)
                .filter(c -> c.getSenhaHash() != null)
                .orElse(null);
        if (cliente == null) {
            return;
        }
        Instant agora = Instant.now();
        long recentes = redefinicoes.countByClienteIdAndOrigemAndCriadoEmAfter(
                cliente.getId(), Origem.SITE, agora.minus(JANELA_LIMITE));
        if (recentes >= LIMITE_PEDIDOS) {
            return;
        }
        LinkGerado gerado = gerar(cliente, Origem.SITE, VALIDADE_SITE, agora);
        String para = cliente.getEmail();
        String nome = cliente.getNome();
        CompletableFuture.runAsync(() ->
                email.enviarLinkDeSenha(para, nome, gerado.link(), VALIDADE_SITE.toMinutes()));
    }

    /** O administrador gera o link pelo ERP (só para quem já tem conta no site). */
    @Transactional
    public LinkGerado gerarPeloErp(Long clienteId) {
        Cliente cliente = clientes.findById(clienteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente não encontrado."));
        if (cliente.getSenhaHash() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Este cliente ainda não tem conta no site. Use \"Criar conta\".");
        }
        return gerar(cliente, Origem.ERP, VALIDADE_ERP, Instant.now());
    }

    /** A tela "Nova senha" confere o link antes de mostrar o formulário. */
    @Transactional(readOnly = true)
    public boolean linkValido(String token) {
        return buscarValido(token, Instant.now()) != null;
    }

    /** Troca a senha, inutiliza o link e encerra as sessões abertas do cliente. */
    @Transactional
    public void redefinir(String token, String novaSenha) {
        Instant agora = Instant.now();
        RedefinicaoSenha r = buscarValido(token, agora);
        if (r == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, LINK_INVALIDO);
        }
        Cliente cliente = clientes.findById(r.getClienteId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, LINK_INVALIDO));
        clienteService.definirSenha(cliente, novaSenha);
        cancelarAbertos(cliente.getId(), agora);
        sessoes.sairDoCliente(cliente.getId());
    }

    private LinkGerado gerar(Cliente cliente, Origem origem, Duration validade, Instant agora) {
        cancelarAbertos(cliente.getId(), agora);
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expira = agora.plus(validade);
        redefinicoes.save(new RedefinicaoSenha(cliente.getId(), hash(token), origem, agora, expira));
        return new LinkGerado(siteUrl + "/redefinir-senha?token=" + token, expira);
    }

    private void cancelarAbertos(Long clienteId, Instant agora) {
        for (RedefinicaoSenha aberto : redefinicoes.findByClienteIdAndUsadoEmIsNull(clienteId)) {
            aberto.setUsadoEm(agora);
        }
    }

    private RedefinicaoSenha buscarValido(String token, Instant agora) {
        if (token == null || token.isBlank() || token.length() > 100) {
            return null;
        }
        return redefinicoes.findByTokenHash(hash(token.trim()))
                .filter(r -> r.valido(agora))
                .orElse(null);
    }

    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
