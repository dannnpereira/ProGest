package com.progest.Backend_api.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "historico_workflow")
public class HistoricoWorkflow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "op", nullable = false)
    private Pedidos pedido;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusWorkflow status;

    @Column(name = "data_alteracao", nullable = false)
    private LocalDateTime dataAlteracao;

    public HistoricoWorkflow() {
    }

    public HistoricoWorkflow(Pedidos pedido, StatusWorkflow status) {
        this.pedido = pedido;
        this.status = status;
        this.dataAlteracao = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Pedidos getPedido() {
        return pedido;
    }

    public StatusWorkflow getStatus() {
        return status;
    }

    public LocalDateTime getDataAlteracao() {
        return dataAlteracao;
    }
}
