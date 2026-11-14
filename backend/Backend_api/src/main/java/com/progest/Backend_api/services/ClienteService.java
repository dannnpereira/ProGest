package com.progest.Backend_api.services;

import com.progest.Backend_api.dto.CadastroRequest;
import com.progest.Backend_api.dto.LoginRequest;
import com.progest.Backend_api.model.Cliente;
import com.progest.Backend_api.repository.ClienteRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ClienteService {

    private final ClienteRepository repository;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public ClienteService(ClienteRepository repository) {
        this.repository = repository;
    }

    public Cliente buscarPorId(Long id) {
        return repository.findById(id).orElse(null);
    }

    // Busca o cliente pelo CPF; se nao existir, cadastra (sem senha)
    @Transactional
    public Cliente buscarOuAdicionarCliente(String cpf, String nome, String email, String telefone) {
        return repository.findByCpf(somenteDigitos(cpf))
                .orElseGet(() -> adicionarCliente(cpf, telefone, nome, email));
    }

    public Cliente adicionarCliente(String cpf, String telefone, String nome, String email) {
        Cliente cliente = new Cliente(somenteDigitos(cpf), telefone, nome, normalizarEmail(email));
        return repository.save(cliente);
    }

    // Cadastro pela tela de login: cria o cliente com a senha guardada como hash BCrypt
    @Transactional
    public Cliente cadastrar(CadastroRequest req) {
        String cpf = somenteDigitos(req.cpf());
        String email = normalizarEmail(req.email());

        if (!cpfValido(cpf)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CPF inválido.");
        }

        Cliente cliente = repository.findByCpf(cpf).orElse(null);
        if (cliente != null && cliente.getSenhaHash() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma conta com este CPF.");
        }

        boolean emailEmUso = repository.findByEmailIgnoreCase(email)
                .filter(outro -> cliente == null || !outro.getId().equals(cliente.getId()))
                .isPresent();
        if (emailEmUso) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma conta com este e-mail.");
        }

        // Cliente ja registrado sem senha (ex.: cadastrado junto com um pedido): ativa a conta
        Cliente novo = cliente != null ? cliente : new Cliente();
        novo.setCpf(cpf);
        novo.setNome(req.nome().trim());
        novo.setEmail(email);
        novo.setTelefone(req.telefone().trim());
        novo.setSenhaHash(passwordEncoder.encode(req.senha()));

        return repository.save(novo);
    }

    // Login: confere e-mail e senha
    public Cliente autenticar(LoginRequest req) {
        return repository.findByEmailIgnoreCase(normalizarEmail(req.email()))
                .filter(c -> c.getSenhaHash() != null)
                .filter(c -> passwordEncoder.matches(req.senha(), c.getSenhaHash()))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "E-mail ou senha incorretos."));
    }

    private static String somenteDigitos(String valor) {
        return valor == null ? null : valor.replaceAll("\\D", "");
    }

    private static String normalizarEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private static boolean cpfValido(String cpf) {
        if (cpf == null || cpf.length() != 11 || cpf.chars().distinct().count() == 1) {
            return false;
        }
        return digitoVerificador(cpf, 9) == cpf.charAt(9) - '0'
                && digitoVerificador(cpf, 10) == cpf.charAt(10) - '0';
    }

    private static int digitoVerificador(String cpf, int tamanho) {
        int soma = 0;
        for (int i = 0; i < tamanho; i++) {
            soma += (cpf.charAt(i) - '0') * (tamanho + 1 - i);
        }
        int resto = (soma * 10) % 11;
        return resto == 10 ? 0 : resto;
    }
}
