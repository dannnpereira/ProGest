package com.progest.Backend_api.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "transacoes_financeiras")
public class TransacaoFinanceira {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(nullable = true,name = "op")
    private Pedidos pedido;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TipoTransacao tipo;

    @Column(length = 255)
    private String fornecedores;

    @Column(nullable = false)
    private String descricao;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    @Column(name = "data_movimentacao", nullable = false)
    private LocalDate dataMovimentacao;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_despesa", length = 20)
    private TipoDespesa tipoDespesa;

    public TransacaoFinanceira() {
    }

    public Long getId() {
        return id;
    }

    public Pedidos getPedido() {
        return pedido;
    }

    public void setPedido(Pedidos pedido) {
        this.pedido = pedido;
    }

    public TipoTransacao getTipo() {
        return tipo;
    }

    public void setTipo(TipoTransacao tipo) {
        this.tipo = tipo;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public BigDecimal getValor() {
        return valor;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
    }

    public LocalDate getDataMovimentacao() {
        return dataMovimentacao;
    }

    public void setDataMovimentacao(LocalDate dataMovimentacao) {
        this.dataMovimentacao = dataMovimentacao;
    }
    public String getFornecedores() {
        return fornecedores;
    }
    public void setFornecedores(String fornecedores) {
        this.fornecedores = fornecedores;
    }
    public TipoDespesa getTipoDespesa() {
    return tipoDespesa;
}

    public void setTipoDespesa(TipoDespesa tipoDespesa) {
    this.tipoDespesa = tipoDespesa;
}
}
