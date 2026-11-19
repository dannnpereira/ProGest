package com.progest.Backend_api.services;

import com.progest.Backend_api.dto.CadastroRequest;
import com.progest.Backend_api.dto.DisponibilidadeRequest;
import com.progest.Backend_api.dto.DisponibilidadeResponse;
import com.progest.Backend_api.dto.LoginRequest;
import com.progest.Backend_api.model.Cliente;
import com.progest.Backend_api.repository.ClienteRepository;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

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
        return cadastrar(req, false);
    }

    // Cadastro feito pelo administrador na tela de orcamento do ERP.
    // Mesmas regras do site; muda so a mensagem quando o CPF/e-mail ja tem conta.
    @Transactional
    public Cliente cadastrarPeloErp(CadastroRequest req) {
        return cadastrar(req, true);
    }

    // Busca do ERP pelo CPF (com ou sem pontuacao). Encontra tambem quem
    // so fez pedido e ainda nao criou conta.
    public Optional<Cliente> buscarPorCpf(String cpfInformado) {
        String cpf = somenteDigitos(cpfInformado);
        if (!cpfValido(cpf)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CPF inválido.");
        }
        return repository.findByCpf(cpf);
    }

    private Cliente cadastrar(CadastroRequest req, boolean peloErp) {
        String cpf = somenteDigitos(req.cpf());
        String email = normalizarEmail(req.email());

        if (!cpfValido(cpf)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CPF inválido.");
        }

        Cliente cliente = repository.findByCpf(cpf).orElse(null);
        DisponibilidadeResponse uso = verificarUso(cpf, email);
        if (uso.cpfEmUso() || uso.emailEmUso()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    peloErp ? mensagemDeConflitoErp(uso) : mensagemDeConflito(uso));
        }

        // Cliente ja registrado sem senha (ex.: cadastrado junto com um pedido): ativa a conta
        Cliente novo = cliente != null ? cliente : new Cliente();
        novo.setCpf(cpf);
        novo.setNome(req.nome().trim());
        novo.setEmail(email);
        novo.setTelefone(req.telefone().trim());
        novo.setSenhaHash(passwordEncoder.encode(req.senha()));

        try {
            return repository.saveAndFlush(novo);
        } catch (DataIntegrityViolationException e) {
            // Duas pessoas cadastrando o mesmo CPF/e-mail ao mesmo tempo: o banco barra a segunda
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma conta com este CPF ou e-mail.");
        }
    }

    /** Usado pela tela de cadastro para avisar antes de enviar o formulário. */
    public DisponibilidadeResponse disponibilidade(DisponibilidadeRequest req) {
        return verificarUso(somenteDigitos(req.cpf()), normalizarEmail(req.email()));
    }

    // "Em uso" = ja existe uma CONTA (com senha). Cliente cadastrado so por um pedido
    // ainda pode criar a conta com o mesmo CPF.
    private DisponibilidadeResponse verificarUso(String cpf, String email) {
        Cliente donoDoCpf = (cpf == null || cpf.isEmpty()) ? null : repository.findByCpf(cpf).orElse(null);
        boolean cpfEmUso = donoDoCpf != null && donoDoCpf.getSenhaHash() != null;

        boolean emailEmUso = email != null && !email.isEmpty() && repository.findByEmailIgnoreCase(email)
                .filter(outro -> donoDoCpf == null || !outro.getId().equals(donoDoCpf.getId())
                        || outro.getSenhaHash() != null)
                .isPresent();

        return new DisponibilidadeResponse(cpfEmUso, emailEmUso);
    }

    private static String mensagemDeConflito(DisponibilidadeResponse uso) {
        if (uso.cpfEmUso() && uso.emailEmUso()) {
            return "Já existe uma conta com este CPF e este e-mail. Use a aba Entrar.";
        }
        return uso.cpfEmUso()
                ? "Já existe uma conta com este CPF. Use a aba Entrar."
                : "Já existe uma conta com este e-mail. Use a aba Entrar.";
    }

    private static String mensagemDeConflitoErp(DisponibilidadeResponse uso) {
        if (uso.cpfEmUso() && uso.emailEmUso()) {
            return "Este CPF e este e-mail já têm conta. Use a busca por CPF.";
        }
        return uso.cpfEmUso()
                ? "Este CPF já tem conta. Use a busca por CPF."
                : "Este e-mail já é usado por outra conta.";
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
