package com.progest.Backend_api.model;

import jakarta.persistence.*;

import java.math.BigDecimal;

// Item da tela "Produtos e Valores" do ERP. O configurador do site le estes precos.
@Entity
@Table(name = "produtos")
public class Produto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Liga o produto a uma opcao do configurador do site (FIO_12, PVC...). Nao muda pelo ERP.
    @Column(unique = true, length = 30)
    private String chave;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CategoriaProduto categoria;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(length = 255)
    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UnidadeProduto unidade;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    @Column(nullable = false)
    private boolean ativo = true;

    public Long getId() { return id; }

    public String getChave() { return chave; }

    public CategoriaProduto getCategoria() { return categoria; }
    public void setCategoria(CategoriaProduto categoria) { this.categoria = categoria; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public UnidadeProduto getUnidade() { return unidade; }
    public void setUnidade(UnidadeProduto unidade) { this.unidade = unidade; }

    public BigDecimal getValor() { return valor; }
    public void setValor(BigDecimal valor) { this.valor = valor; }

    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
}
