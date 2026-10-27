package com.progest.Backend_api.controller;

import com.progest.Backend_api.model.Cliente;
import com.progest.Backend_api.repository.ClienteRepository;
import com.progest.Backend_api.services.ClienteService;

import org.springframework.web.bind.annotation.*;

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
public Cliente buscarPorId(@PathVariable Long id) {
    return clienteService.buscarPorId(id);
}

    @GetMapping
    public Iterable listar() {
        return repository.findAll();
    }

    @PostMapping
    public Object cadastrar(@RequestBody Cliente cliente) {
        return repository.save(cliente);
    }
}
