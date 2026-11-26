package com.progest.Backend_api.controller;

import com.progest.Backend_api.dto.BuscaCpfRequest;
import com.progest.Backend_api.dto.CadastroRequest;
import com.progest.Backend_api.dto.ClienteErpResponse;
import com.progest.Backend_api.dto.LinkSenhaResponse;
import com.progest.Backend_api.services.ClienteService;
import com.progest.Backend_api.services.RedefinicaoSenhaService;

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
    private final RedefinicaoSenhaService redefinicao;

    public ErpClientesController(ClienteService clienteService, RedefinicaoSenhaService redefinicao) {
        this.clienteService = clienteService;
        this.redefinicao = redefinicao;
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

    // Link de nova senha para o administrador mandar ao cliente (vale 24 h, uso unico).
    // Cancela links anteriores. 409 se o cliente ainda nao tem conta no site.
    @PostMapping("/{id}/link-senha")
    @ResponseStatus(HttpStatus.CREATED)
    public LinkSenhaResponse gerarLinkDeSenha(@PathVariable Long id) {
        var gerado = redefinicao.gerarPeloErp(id);
        return new LinkSenhaResponse(gerado.link(), gerado.expiraEm());
    }
}
