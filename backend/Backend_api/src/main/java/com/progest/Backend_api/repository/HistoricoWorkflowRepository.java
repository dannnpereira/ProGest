package com.progest.Backend_api.repository;

import com.progest.Backend_api.model.HistoricoWorkflow;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HistoricoWorkflowRepository
        extends JpaRepository<HistoricoWorkflow, Long> {

    List<HistoricoWorkflow> findByPedidoOpOrderByDataAlteracaoAsc(Long op);
}
