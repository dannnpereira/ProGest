package com.progest.Backend_api.controller;

import com.progest.Backend_api.config.ErpAuthInterceptor;
import com.progest.Backend_api.dto.CadastroRequest;
import com.progest.Backend_api.dto.DisponibilidadeRequest;
import com.progest.Backend_api.dto.DisponibilidadeResponse;
import com.progest.Backend_api.dto.EsqueciSenhaRequest;
import com.progest.Backend_api.dto.LoginRequest;
import com.progest.Backend_api.dto.RedefinirSenhaRequest;
import com.progest.Backend_api.dto.SessaoClienteResponse;
import com.progest.Backend_api.dto.TokenSenhaRequest;
import com.progest.Backend_api.services.ClienteService;
import com.progest.Backend_api.services.RedefinicaoSenhaService;
import com.progest.Backend_api.services.SessaoClienteService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

// Endpoints usados pela tela de login do site (progest/).
// Login e cadastro já devolvem o token da sessão do cliente.
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final ClienteService clienteService;
    private final SessaoClienteService sessoes;
    private final RedefinicaoSenhaService redefinicao;

    public AuthController(ClienteService clienteService, SessaoClienteService sessoes,
                          RedefinicaoSenhaService redefinicao) {
        this.clienteService = clienteService;
        this.sessoes = sessoes;
        this.redefinicao = redefinicao;
    }

    @PostMapping("/cadastro")
    @ResponseStatus(HttpStatus.CREATED)
    public SessaoClienteResponse cadastrar(@Valid @RequestBody CadastroRequest request) {
        return sessoes.entrar(clienteService.cadastrar(request));
    }

    // A tela de cadastro pergunta antes de enviar se o CPF/e-mail ja tem conta
    @PostMapping("/disponibilidade")
    public DisponibilidadeResponse disponibilidade(@RequestBody DisponibilidadeRequest request) {
        return clienteService.disponibilidade(request);
    }

    @PostMapping("/login")
    public SessaoClienteResponse login(@Valid @RequestBody LoginRequest request) {
        return sessoes.entrar(clienteService.autenticar(request));
    }

    @PostMapping("/sair")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void sair(HttpServletRequest request) {
        sessoes.sair(ErpAuthInterceptor.tokenDe(request));
    }

    // "Esqueceu a senha?": sempre 202, com ou sem conta, para nao revelar quem e cliente
    @PostMapping("/esqueci-senha")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void esqueciSenha(@Valid @RequestBody EsqueciSenhaRequest request) {
        redefinicao.solicitarPeloSite(request.email());
    }

    // A tela "Nova senha" confere o link antes de mostrar o formulario (204 ou 400)
    @PostMapping("/redefinir-senha/validar")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void validarLink(@Valid @RequestBody TokenSenhaRequest request) {
        if (!redefinicao.linkValido(request.token())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, RedefinicaoSenhaService.LINK_INVALIDO);
        }
    }

    @PostMapping("/redefinir-senha")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void redefinirSenha(@Valid @RequestBody RedefinirSenhaRequest request) {
        redefinicao.redefinir(request.token(), request.senha());
    }
}
