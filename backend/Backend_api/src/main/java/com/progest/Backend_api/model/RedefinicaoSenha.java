package com.progest.Backend_api.model;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * Link de uso único para o cliente do site criar uma senha nova.
 * Só o hash SHA-256 do token fica no banco: quem lê a tabela não consegue usar o link.
 */
@Entity
@Table(name = "redefinicoes_senha")
public class RedefinicaoSenha {

    /** SITE = "Esqueceu a senha?" (e-mail); ERP = link gerado pelo administrador */
    public enum Origem { SITE, ERP }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cliente_id", nullable = false)
    private Long clienteId;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Origem origem;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "expira_em", nullable = false)
    private Instant expiraEm;

    @Column(name = "usado_em")
    private Instant usadoEm;

    protected RedefinicaoSenha() {
    }

    public RedefinicaoSenha(Long clienteId, String tokenHash, Origem origem, Instant criadoEm, Instant expiraEm) {
        this.clienteId = clienteId;
        this.tokenHash = tokenHash;
        this.origem = origem;
        this.criadoEm = criadoEm;
        this.expiraEm = expiraEm;
    }

    /** Ainda pode ser usado: não foi usado nem cancelado e não venceu. */
    public boolean valido(Instant agora) {
        return usadoEm == null && agora.isBefore(expiraEm);
    }

    public Long getId() { return id; }
    public Long getClienteId() { return clienteId; }
    public String getTokenHash() { return tokenHash; }
    public Origem getOrigem() { return origem; }
    public Instant getCriadoEm() { return criadoEm; }
    public Instant getExpiraEm() { return expiraEm; }
    public Instant getUsadoEm() { return usadoEm; }

    public void setUsadoEm(Instant usadoEm) { this.usadoEm = usadoEm; }
}
