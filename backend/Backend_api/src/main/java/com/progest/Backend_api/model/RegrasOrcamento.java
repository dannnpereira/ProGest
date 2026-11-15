package com.progest.Backend_api.model;

import jakarta.persistence.*;

import java.math.BigDecimal;

// Regras usadas no orcamento do site. A tabela tem uma linha so (id = 1).
@Entity
@Table(name = "regras_orcamento")
public class RegrasOrcamento {

    public static final int ID_UNICO = 1;

    @Id
    private Integer id;

    @Column(name = "desconto_avista_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal descontoAVistaPct;

    @Column(name = "parcelas_max", nullable = false)
    private Integer parcelasMax;

    public Integer getId() { return id; }

    public BigDecimal getDescontoAVistaPct() { return descontoAVistaPct; }
    public void setDescontoAVistaPct(BigDecimal descontoAVistaPct) { this.descontoAVistaPct = descontoAVistaPct; }

    public Integer getParcelasMax() { return parcelasMax; }
    public void setParcelasMax(Integer parcelasMax) { this.parcelasMax = parcelasMax; }
}
