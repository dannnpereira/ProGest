package com.progest.Backend_api.controller;

import com.progest.Backend_api.model.Cliente;
import com.progest.Backend_api.repository.ClienteRepository;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {
    private final ClienteRepository repository;

    public ClienteController(ClienteRepository repository) {
        this.repository = repository;
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
