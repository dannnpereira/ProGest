package com.progest.Backend_api.config;

import com.progest.Backend_api.model.UsuarioErp;
import com.progest.Backend_api.repository.UsuarioErpRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Cria o primeiro usuario do ERP quando a tabela usuarios_erp esta vazia.
 * E-mail, nome e senha vem de progest.admin.* (variaveis ADMIN_EMAIL, ADMIN_NOME
 * e ADMIN_SENHA no servidor). Depois de criado, mudar essas variaveis nao altera
 * o usuario que ja existe.
 */
@Component
public class AdminInicial implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminInicial.class);

    private final UsuarioErpRepository repository;
    private final String email;
    private final String nome;
    private final String senha;

    public AdminInicial(UsuarioErpRepository repository,
                        @Value("${progest.admin.email}") String email,
                        @Value("${progest.admin.nome}") String nome,
                        @Value("${progest.admin.senha:}") String senha) {
        this.repository = repository;
        this.email = email;
        this.nome = nome;
        this.senha = senha;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (repository.count() > 0) {
            return;
        }
        if (senha == null || senha.length() < 8) {
            log.warn("Nenhum usuario do ERP cadastrado e ADMIN_SENHA nao definida (minimo 8 caracteres). "
                    + "Ninguem conseguira entrar no ERP.");
            return;
        }
        repository.save(new UsuarioErp(nome, email.trim().toLowerCase(), new BCryptPasswordEncoder().encode(senha)));
        log.info("Usuario inicial do ERP criado: {}", email);
    }
}
