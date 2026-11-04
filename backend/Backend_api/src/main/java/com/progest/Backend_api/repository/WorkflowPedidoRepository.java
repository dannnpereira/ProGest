package com.progest.Backend_api.repository;

import com.progest.Backend_api.model.WorkflowPedido;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkflowPedidoRepository
        extends JpaRepository<WorkflowPedido, Long> {
}
