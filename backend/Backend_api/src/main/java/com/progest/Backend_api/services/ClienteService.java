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

        return repository.findById(id).orElse(null);
    }
    public Cliente buscarOuAdicionarCliente(Long id,String cpf, String nome, String email, Long telefone) {

        // Busca o CPF no banco de dados
        return repository.findById(id)
                .orElseGet(() -> adicionarCliente(cpf,telefone, nome,email ));
    }

    public Cliente adicionarCliente(String cpf, Long telefone, String email, String nome) {

        // Cria um novo cliente
        Cliente cliente = new Cliente();

        cliente.setCpf(cpf);
        cliente.setNome(nome);
        cliente.setEmail(email);
        cliente.setTelefone(telefone);

        // Salva na tabela Clientes
        return repository.save(cliente);
    }
    }


