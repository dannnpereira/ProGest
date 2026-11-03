
package com.progest.Backend_api.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "pedidos")
public class Pedidos {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long op;

    @Column(precision = 10, scale = 2)
    private BigDecimal fio;

    @Column(precision = 10, scale = 2)
    private BigDecimal malha;

    private LocalDate dataentrega;

    public Pedidos() {
    }

    public Pedidos(BigDecimal fio, BigDecimal malha, LocalDate dataentrega) {
        this.fio = fio;
        this.malha = malha;
        this.dataentrega = dataentrega;
    }

    public Long getOp() {
        return op;
    }

    public BigDecimal getFio() {
        return fio;
    }

    public void setFio(BigDecimal fio) {
        this.fio = fio;
    }

    public BigDecimal getMalha() {
        return malha;
    }

    public void setMalha(BigDecimal malha) {
        this.malha = malha;
    }

    public LocalDate getDataentrega() {
        return dataentrega;
    }

    public void setDataentrega(LocalDate dataentrega) {
        this.dataentrega = dataentrega;
    }
}
