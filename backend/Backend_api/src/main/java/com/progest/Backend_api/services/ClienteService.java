package com.progest.Backend_api.services;


import com.progest.Backend_api.model.Cliente;
import com.progest.Backend_api.repository.ClienteRepository;
import org.springframework.stereotype.Service;

@Service
public class ClienteService {

    private static ClienteRepository repository = null;

    public ClienteService(ClienteRepository repository) {
        ClienteService.repository = repository;
    }

    public static Cliente buscarPorId(Long id) {

        return repository.findById(id)
                .orElseThrow(() ->
                    new RuntimeException("Cliente não encontrado")
                );
    }
}

