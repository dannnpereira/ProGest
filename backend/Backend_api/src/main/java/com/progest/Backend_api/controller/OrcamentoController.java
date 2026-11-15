package com.progest.Backend_api.controller;

import com.progest.Backend_api.dto.OrcamentoRequest;
import com.progest.Backend_api.dto.OrcamentoResponse;
import com.progest.Backend_api.services.OrcamentoService;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

// Usada pelo configurador do site (aberta) e pela "Previa no orcamento" do ERP
@RestController
@RequestMapping("/api/orcamento")
public class OrcamentoController {

    private final OrcamentoService service;

    public OrcamentoController(OrcamentoService service) {
        this.service = service;
    }

    @PostMapping
    public OrcamentoResponse calcular(@Valid @RequestBody OrcamentoRequest req) {
        return service.calcular(req);
    }
}
