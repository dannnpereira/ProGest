
package com.progest.Backend_api.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "pedidos")
public class Pedidos {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long op;

    private Long fio;

    private Long malha;

    private LocalDate dataentrega;

    public Pedidos() {
    }

    public Pedidos(Long fio, Long malha, LocalDate dataentrega) {
        this.fio = fio;
        this.malha = malha;
        this.dataentrega = dataentrega;
    }

    public Long getOp() {
        return op;
    }

    public Long getFio() {
        return fio;
    }

    public void setFio(Long fio) {
        this.fio = fio;
    }

    public Long getMalha() {
        return malha;
    }

    public void setMalha(Long malha) {
        this.malha = malha;
    }

    public LocalDate getDataentrega() {
        return dataentrega;
    }

    public void setDataentrega(LocalDate dataentrega) {
        this.dataentrega = dataentrega;
    }
}
