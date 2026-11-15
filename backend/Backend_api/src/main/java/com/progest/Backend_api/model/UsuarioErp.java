package com.progest.Backend_api.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

// Usuario do painel de gestao (ERP). Nao confundir com Cliente, que e quem compra pelo site.
@Entity
@Table(name = "usuarios_erp")
public class UsuarioErp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nome;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @JsonIgnore
    @Column(name = "senha_hash", nullable = false, length = 100)
    private String senhaHash;

    @Column(nullable = false)
    private boolean ativo = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PerfilErp perfil = PerfilErp.ADMIN;

    public UsuarioErp() {
    }

    public UsuarioErp(String nome, String email, String senhaHash) {
        this(nome, email, senhaHash, PerfilErp.ADMIN);
    }

    public UsuarioErp(String nome, String email, String senhaHash, PerfilErp perfil) {
        this.nome = nome;
        this.email = email;
        this.senhaHash = senhaHash;
        this.perfil = perfil;
    }

    public PerfilErp getPerfil() { return perfil; }
    public void setPerfil(PerfilErp perfil) { this.perfil = perfil; }

    public Long getId() { return id; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getSenhaHash() { return senhaHash; }
    public void setSenhaHash(String senhaHash) { this.senhaHash = senhaHash; }

    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
}
