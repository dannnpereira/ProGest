package com.progest.Backend_api.model;

import jakarta.persistence.*;

import java.math.BigDecimal;

/**
 * Linha da tabela de precos da Amaral: arame + malha + tratamento, com o valor
 * a vista e a prazo. Telas (M2) viram as combinacoes do configurador do site;
 * arame avulso (KG) nao tem malha e so aparece no ERP.
 * Os produtos vao pela chave (FIO_12, MALHA_3, GALVANIZADA...).
 */
@Entity
@Table(name = "precos_tela")
public class PrecoTela {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 30) private String arame;
    @Column(length = 30) private String malha;
    @Column(nullable = false, length = 30) private String tratamento;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private UnidadePreco unidade;

    /** Peso da tela em kg/m2 (informativo; nao entra no preco) */
    @Column(name = "peso_kg_m2", precision = 8, scale = 3) private BigDecimal pesoKgM2;

    @Column(name = "valor_vista", nullable = false, precision = 10, scale = 2) private BigDecimal valorVista;
    /** Sem valor a prazo, o parcelado usa o valor a vista */
    @Column(name = "valor_prazo", precision = 10, scale = 2) private BigDecimal valorPrazo;

    @Column(nullable = false) private boolean excluido = false;

    public Long getId() { return id; }
    public String getArame() { return arame; }
    public void setArame(String arame) { this.arame = arame; }
    public String getMalha() { return malha; }
    public void setMalha(String malha) { this.malha = malha; }
    public String getTratamento() { return tratamento; }
    public void setTratamento(String tratamento) { this.tratamento = tratamento; }
    public UnidadePreco getUnidade() { return unidade; }
    public void setUnidade(UnidadePreco unidade) { this.unidade = unidade; }
    public BigDecimal getPesoKgM2() { return pesoKgM2; }
    public void setPesoKgM2(BigDecimal pesoKgM2) { this.pesoKgM2 = pesoKgM2; }
    public BigDecimal getValorVista() { return valorVista; }
    public void setValorVista(BigDecimal valorVista) { this.valorVista = valorVista; }
    public BigDecimal getValorPrazo() { return valorPrazo; }
    public void setValorPrazo(BigDecimal valorPrazo) { this.valorPrazo = valorPrazo; }
    public boolean isExcluido() { return excluido; }
    public void setExcluido(boolean excluido) { this.excluido = excluido; }

    /** Valor a prazo; sem ele, o a vista */
    public BigDecimal prazoOuVista() { return valorPrazo != null ? valorPrazo : valorVista; }
}
