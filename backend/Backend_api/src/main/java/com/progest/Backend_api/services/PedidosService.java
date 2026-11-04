package com.progest.Backend_api.services;

import com.progest.Backend_api.model.*;
import com.progest.Backend_api.repository.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PedidosService {

    private final PedidosRepository pedidosRepository;
    private final WorkflowPedidoRepository workflowRepository;
    private final HistoricoWorkflowRepository historicoRepository;

    public PedidosService(
            PedidosRepository pedidosRepository,
            WorkflowPedidoRepository workflowRepository,
            HistoricoWorkflowRepository historicoRepository) {

        this.pedidosRepository = pedidosRepository;
        this.workflowRepository = workflowRepository;
        this.historicoRepository = historicoRepository;
    }

    @Transactional
    public Pedidos cadastrarPedido(Pedidos pedido) {

        // 1. Salva o pedido e gera sua OP
        Pedidos novoPedido = pedidosRepository.save(pedido);

        // 2. Cria automaticamente sua entrada no workflow
        WorkflowPedido workflow = new WorkflowPedido(novoPedido);

        workflowRepository.save(workflow);

        // 3. Registra a primeira movimentação no histórico
        HistoricoWorkflow historico = new HistoricoWorkflow(
                novoPedido,
                StatusWorkflow.A_FAZER
        );

        historicoRepository.save(historico);

        return novoPedido;
    }
}
