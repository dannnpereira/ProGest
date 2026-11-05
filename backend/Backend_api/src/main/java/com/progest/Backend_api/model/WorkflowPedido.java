package com.progest.Backend_api.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "workflow_pedidos")
public class WorkflowPedido {

    @Id
    private Long op;

    @OneToOne
    @MapsId
    @JoinColumn(name = "op")
    private Pedidos pedido;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusWorkflow status;

    @Column(name = "data_atualizacao", nullable = false)
    private LocalDateTime dataAtualizacao;

    public WorkflowPedido() {
    }

    public WorkflowPedido(Pedidos pedido) {
        this.pedido = pedido;
        this.status = StatusWorkflow.A_FAZER;
        this.dataAtualizacao = LocalDateTime.now();
    }

    public Long getOp() {
        return op;
    }

    public Pedidos getPedido() {
        return pedido;
    }

    public StatusWorkflow getStatus() {
        return status;
    }

    public void setStatus(StatusWorkflow status) {
        this.status = status;
        this.dataAtualizacao = LocalDateTime.now();
    }

    public LocalDateTime getDataAtualizacao() {
        return dataAtualizacao;
    }
}
