package com.progest.Backend_api.model; 

import jakarta.persistence.*;

@Entity
@Table(name = "pedidos")
public class Pedidos {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long op;;
    private Long fio;
    private Long malha;
    private String dataentrega;

    public Pedidos() {
    }

    public Pedidos(Long op, Long fio, Long malha, String dataentrega) {
        this.op = op;
        this.fio = fio;
        this.malha = malha;
        this.dataentrega = dataentrega;
    } {
    
}
}
