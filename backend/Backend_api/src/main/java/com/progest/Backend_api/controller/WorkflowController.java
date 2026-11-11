package com.progest.Backend_api.controller;

import com.progest.Backend_api.model.StatusWorkflow;
import com.progest.Backend_api.model.WorkflowPedido;
import com.progest.Backend_api.services.WorkflowService;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workflow")
public class WorkflowController {

    private final WorkflowService workflowService;

    public WorkflowController(WorkflowService workflowService) {
        this.workflowService = workflowService;
    }

    @PatchMapping("/{op}/status")
    public WorkflowPedido atualizarStatus(
            @PathVariable Long op,
            @RequestParam StatusWorkflow novoStatus
    ) {
        return workflowService.atualizarStatus(op, novoStatus);
    }
}