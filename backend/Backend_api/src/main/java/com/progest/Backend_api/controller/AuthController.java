package com.progest.Backend_api.controller;

import com.progest.Backend_api.dto.CadastroRequest;
import com.progest.Backend_api.dto.ClienteResponse;
import com.progest.Backend_api.dto.LoginRequest;
import com.progest.Backend_api.services.ClienteService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

// Endpoints usados pela tela de login do site (progest/)
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final ClienteService clienteService;

    public AuthController(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    @PostMapping("/cadastro")
    @ResponseStatus(HttpStatus.CREATED)
    public ClienteResponse cadastrar(@Valid @RequestBody CadastroRequest request) {
        return ClienteResponse.de(clienteService.cadastrar(request));
    }

    @PostMapping("/login")
    public ClienteResponse login(@Valid @RequestBody LoginRequest request) {
        return ClienteResponse.de(clienteService.autenticar(request));
    }
}
