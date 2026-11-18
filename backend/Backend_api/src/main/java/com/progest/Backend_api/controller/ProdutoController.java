package com.progest.Backend_api.controller;

import com.progest.Backend_api.dto.CatalogoItem;
import com.progest.Backend_api.dto.ProdutoRequest;
import com.progest.Backend_api.dto.ProdutoResponse;
import com.progest.Backend_api.dto.RegrasOrcamentoDto;
import com.progest.Backend_api.services.ProdutoService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Produtos e valores editados pelo ERP (rotas /api/erp/, exigem login).
// O site le as opcoes em /api/catalogo (aberta, sem precos) e pede o orcamento
// pronto em /api/orcamento.
@RestController
public class ProdutoController {

    private final ProdutoService service;

    public ProdutoController(ProdutoService service) {
        this.service = service;
    }

    @GetMapping("/api/erp/produtos")
    public List<ProdutoResponse> listar() {
        return service.listar();
    }

    @PostMapping("/api/erp/produtos")
    @ResponseStatus(HttpStatus.CREATED)
    public ProdutoResponse criar(@Valid @RequestBody ProdutoRequest req) {
        return service.criar(req);
    }

    @PutMapping("/api/erp/produtos/{id}")
    public ProdutoResponse atualizar(@PathVariable Long id, @Valid @RequestBody ProdutoRequest req) {
        return service.atualizar(id, req);
    }

    @DeleteMapping("/api/erp/produtos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        service.excluir(id);
    }

    /** Opcoes de arame, malha e tratamento do configurador do site (sem login). */
    @GetMapping("/api/catalogo")
    public List<CatalogoItem> catalogo() {
        return service.catalogo();
    }

    @GetMapping("/api/erp/regras-orcamento")
    public RegrasOrcamentoDto regras() {
        return service.buscarRegras();
    }

    @PutMapping("/api/erp/regras-orcamento")
    public RegrasOrcamentoDto salvarRegras(@Valid @RequestBody RegrasOrcamentoDto dto) {
        return service.salvarRegras(dto);
    }
}
