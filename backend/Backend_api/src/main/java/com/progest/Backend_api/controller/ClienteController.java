package com.progest.Backend_api.controller;

import com.progest.Backend_api.dto.ClienteResponse;
import com.progest.Backend_api.repository.ClienteRepository;
import com.progest.Backend_api.services.ClienteService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {
    private final ClienteRepository repository;
    private final ClienteService clienteService;

    public ClienteController(ClienteRepository repository, ClienteService clienteService) {
        this.repository = repository;
        this.clienteService = clienteService;
    }

    @GetMapping("/id/{id}")
    public ClienteResponse buscarPorId(@PathVariable Long id) {
        var cliente = clienteService.buscarPorId(id);
        if (cliente == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente não encontrado.");
        }
        return ClienteResponse.de(cliente);
    }

    @GetMapping
    public List<ClienteResponse> listar() {
        return repository.findAll().stream().map(ClienteResponse::de).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClienteResponse cadastrar(
            @RequestParam String cpf,
            @RequestParam String telefone,
            @RequestParam String nome,
            @RequestParam String email) {
        return ClienteResponse.de(clienteService.adicionarCliente(cpf, telefone, nome, email));
    }

    @PostMapping("/buscar-ou-adicionar")
    public ClienteResponse buscarOuAdicionar(
            @RequestParam String cpf,
            @RequestParam String nome,
            @RequestParam String email,
            @RequestParam String telefone) {
        return ClienteResponse.de(clienteService.buscarOuAdicionarCliente(cpf, nome, email, telefone));
    }
}
