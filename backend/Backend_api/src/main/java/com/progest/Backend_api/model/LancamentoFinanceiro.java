package com.progest.Backend_api.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Lançamento do Financeiro do ERP: compra de material, despesa (saída) ou
 * entrada avulsa. Os pagamentos dos pedidos do site ficam no próprio pedido.
 */
@Entity
@Table(name = "lancamentos_financeiros")
public class LancamentoFinanceiro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TipoLancamento tipo;

    @Column(name = "data_lancamento", nullable = false)
    private LocalDate data;

    /** Só nas despesas */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private CategoriaDespesa categoria;

    /** Material (compra) ou descrição (despesa/entrada) */
    @Column(nullable = false, length = 255)
    private String descricao;

    /** Fornecedor (compra), favorecido (despesa) ou origem (entrada) */
    @Column(length = 150)
    private String favorecido;

    /** Só nas compras */
    @Column(length = 100)
    private String quantidade;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal valor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private StatusLancamento status;

    public Long getId() { return id; }
    public TipoLancamento getTipo() { return tipo; }
    public void setTipo(TipoLancamento v) { this.tipo = v; }
    public LocalDate getData() { return data; }
    public void setData(LocalDate v) { this.data = v; }
    public CategoriaDespesa getCategoria() { return categoria; }
    public void setCategoria(CategoriaDespesa v) { this.categoria = v; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String v) { this.descricao = v; }
    public String getFavorecido() { return favorecido; }
    public void setFavorecido(String v) { this.favorecido = v; }
    public String getQuantidade() { return quantidade; }
    public void setQuantidade(String v) { this.quantidade = v; }
    public BigDecimal getValor() { return valor; }
    public void setValor(BigDecimal v) { this.valor = v; }
    public StatusLancamento getStatus() { return status; }
    public void setStatus(StatusLancamento v) { this.status = v; }
}
