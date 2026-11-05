package com.progest.Backend_api.service;

import com.progest.Backend_api.model.Cliente;
import com.progest.Backend_api.repository.ClienteRepository;
import org.springframework.stereotype.Service;

@Service
public class ClienteService {

    private final ClienteRepository repository;

    public ClienteService(ClienteRepository repository) {
        this.repository = repository;
    }

    public Cliente cadastrarCliente(String nome) {
        Random r = new Random();
        this.id = r.nextLong();
        return repository.save(clientes);
    }
}