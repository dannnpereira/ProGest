package com.progest.Backend_api.services;

import com.progest.Backend_api.model.StatusWorkflow;
import com.progest.Backend_api.model.WorkflowPedido;
import com.progest.Backend_api.repository.WorkflowPedidoRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WorkflowService {

    private final WorkflowPedidoRepository workflowRepository;

    public WorkflowService(
            WorkflowPedidoRepository workflowRepository) {
        this.workflowRepository = workflowRepository;
    }

    @Transactional
    public WorkflowPedido atualizarStatus(
            Long op,
            StatusWorkflow novoStatus
    ) {

        WorkflowPedido workflow = workflowRepository.findById(op)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Workflow da OP " + op + " não encontrado."
            ));

        StatusWorkflow statusAtual = workflow.getStatus();

        if (novoStatus == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "O novo status deve ser informado."
            );
        }

        // Impede repetir a mesma etapa
        if (statusAtual == novoStatus) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "O pedido já está nesta etapa."
            );
        }

        // Valida a sequência de etapas
        boolean transicaoPermitida =
            (statusAtual == StatusWorkflow.A_FAZER
                && novoStatus == StatusWorkflow.EM_PROCESSO)
            ||
            (statusAtual == StatusWorkflow.EM_PROCESSO
                && novoStatus == StatusWorkflow.ENTREGUE);

        if (!transicaoPermitida) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Transição inválida: não é permitido passar de "
                + statusAtual + " para " + novoStatus + "."
            );
        }

        workflow.setStatus(novoStatus);

        return workflowRepository.save(workflow);
    }
}