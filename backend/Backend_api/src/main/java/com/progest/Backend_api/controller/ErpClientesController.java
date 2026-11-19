package com.progest.Backend_api.controller;

import com.progest.Backend_api.dto.BuscaCpfRequest;
import com.progest.Backend_api.dto.CadastroRequest;
import com.progest.Backend_api.dto.ClienteErpResponse;
import com.progest.Backend_api.services.ClienteService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

// Clientes na tela "Novo orcamento" do ERP. Ficam em /api/erp/, entao exigem o login
// do painel e sao so do ADMIN (ver ErpAuthInterceptor).
@RestController
@RequestMapping("/api/erp/clientes")
public class ErpClientesController {

    private final ClienteService clienteService;

    public ErpClientesController(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    // Puxa os dados do cliente pelo CPF. 404 quando nao ha cadastro.
    @PostMapping("/busca")
    public ClienteErpResponse buscarPorCpf(@Valid @RequestBody BuscaCpfRequest req) {
        return clienteService.buscarPorCpf(req.cpf())
                .map(ClienteErpResponse::de)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Nenhum cliente com este CPF."));
    }

    // Cria a conta do cliente com os mesmos dados do cadastro do site.
    // Diferente de /api/auth/cadastro, nao abre sessao para o cliente.
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClienteErpResponse cadastrar(@Valid @RequestBody CadastroRequest req) {
        return ClienteErpResponse.de(clienteService.cadastrarPeloErp(req));
    }
}
