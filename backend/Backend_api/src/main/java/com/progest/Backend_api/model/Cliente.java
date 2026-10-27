package com.progest.Backend_api.model; 

import java.util.Random;

import jakarta.persistence.*;

@Entity
@Table(name = "clientes")
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String cpf;
    private Long telefone;
    private String nome;
    private String email;

    public Cliente() {
    }

    public Cliente(String cpf, Long id, Long telefone, String nome, String email) {
        this.cpf = cpf;
        this.id = id;
        this.telefone = telefone;
        this.nome = nome;
        this.email = email;
    }
    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setCpf(String cpf2) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'setCpf'");
    }

    public void setTelefone(Long telefone2) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'setTelefone'");
    }
}
