package com.progest.Backend_api.controller;

import com.progest.Backend_api.dto.CatalogoItem;
import com.progest.Backend_api.dto.CombinacaoItem;
import com.progest.Backend_api.dto.PrecoTelaRequest;
import com.progest.Backend_api.dto.PrecoTelaResponse;
import com.progest.Backend_api.dto.ProdutoRequest;
import com.progest.Backend_api.dto.ProdutoResponse;
import com.progest.Backend_api.dto.RegrasOrcamentoDto;
import com.progest.Backend_api.services.CatalogoService;
import com.progest.Backend_api.services.PrecoTelaService;
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
    private final PrecoTelaService precos;
    private final CatalogoService catalogo;

    public ProdutoController(ProdutoService service, PrecoTelaService precos, CatalogoService catalogo) {
        this.service = service;
        this.precos = precos;
        this.catalogo = catalogo;
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
        return catalogo.itens();
    }

    /** Combinacoes arame + malha + tratamento que tem preco na tabela (sem login, sem precos). */
    @GetMapping("/api/catalogo/combinacoes")
    public List<CombinacaoItem> combinacoes() {
        return catalogo.combinacoes();
    }

    // ---------- Tabela de precos (tela por m2 e arame por kg) ----------

    @GetMapping("/api/erp/precos")
    public List<PrecoTelaResponse> listarPrecos() {
        return precos.listar();
    }

    @PostMapping("/api/erp/precos")
    @ResponseStatus(HttpStatus.CREATED)
    public PrecoTelaResponse criarPreco(@Valid @RequestBody PrecoTelaRequest req) {
        return precos.criar(req);
    }

    @PutMapping("/api/erp/precos/{id}")
    public PrecoTelaResponse atualizarPreco(@PathVariable Long id, @Valid @RequestBody PrecoTelaRequest req) {
        return precos.atualizar(id, req);
    }

    @DeleteMapping("/api/erp/precos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluirPreco(@PathVariable Long id) {
        precos.excluir(id);
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
