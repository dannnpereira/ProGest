package com.progest.Backend_api.controller;

import com.progest.Backend_api.config.ErpAuthInterceptor;
import com.progest.Backend_api.dto.LoginRequest;
import com.progest.Backend_api.dto.SessaoErpResponse;
import com.progest.Backend_api.dto.UsuarioErpResponse;
import com.progest.Backend_api.model.UsuarioErp;
import com.progest.Backend_api.services.SessaoErpService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

// Login do painel de gestao (ERP).
// O login fica em /api/auth/ para cair no limite de tentativas do Nginx;
// a sessao fica em /api/erp/, que exige o token (ErpAuthInterceptor).
@RestController
public class ErpAuthController {

    private final SessaoErpService sessoes;

    public ErpAuthController(SessaoErpService sessoes) {
        this.sessoes = sessoes;
    }

    @PostMapping("/api/auth/erp/login")
    public SessaoErpResponse login(@Valid @RequestBody LoginRequest request) {
        return sessoes.entrar(request);
    }

    // Confere se o token ainda vale e devolve quem esta logado
    @GetMapping("/api/erp/sessao")
    public UsuarioErpResponse sessao(@RequestAttribute(ErpAuthInterceptor.ATRIBUTO_USUARIO) UsuarioErp usuario) {
        return UsuarioErpResponse.de(usuario);
    }

    @DeleteMapping("/api/erp/sessao")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void sair(HttpServletRequest request) {
        sessoes.sair(ErpAuthInterceptor.tokenDe(request));
    }
}
