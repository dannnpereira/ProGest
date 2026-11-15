package com.progest.Backend_api.config;

import com.progest.Backend_api.model.PerfilErp;
import com.progest.Backend_api.model.UsuarioErp;
import com.progest.Backend_api.repository.UsuarioErpRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Garante, ao iniciar, que os usuarios fixos do ERP existam com o e-mail, a senha
 * e o perfil configurados:
 *
 *   Administrador -> ADMIN_EMAIL / ADMIN_NOME / ADMIN_SENHA                (todas as telas)
 *   Funcionario   -> FUNCIONARIO_EMAIL / FUNCIONARIO_NOME / FUNCIONARIO_SENHA (so Producao)
 *
 * - Nao existe: cria.
 * - Existe com outra senha ou outro perfil: atualiza (para trocar a senha, basta
 *   mudar a variavel e reiniciar).
 * - Sem e-mail ou senha (minimo 8 caracteres): nao mexe em nada.
 *
 * Como o banco do Render gratis e apagado a cada reinicio, criar por aqui garante que
 * os acessos voltem sozinhos. As senhas nunca ficam no codigo (repositorio publico).
 *
 * Tambem desativa o administrador de exemplo das primeiras versoes
 * (admin@amaral.com.br), cuja senha ficou publica no repositorio.
 */
@Component
public class AdminInicial implements SmartInitializingSingleton {

    private static final Logger log = LoggerFactory.getLogger(AdminInicial.class);
    static final String EMAIL_ANTIGO = "admin@amaral.com.br";

    private final UsuarioErpRepository repository;
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();

    private final Conta admin;
    private final Conta funcionario;

    private record Conta(String email, String nome, String senha, PerfilErp perfil) {
        Conta {
            email = email == null ? "" : email.trim().toLowerCase();
        }
    }

    @Autowired
    public AdminInicial(UsuarioErpRepository repository,
                        @Value("${progest.admin.email}") String email,
                        @Value("${progest.admin.nome}") String nome,
                        @Value("${progest.admin.senha:}") String senha,
                        @Value("${progest.funcionario.email:}") String funcEmail,
                        @Value("${progest.funcionario.nome:Funcionário}") String funcNome,
                        @Value("${progest.funcionario.senha:}") String funcSenha) {
        this.repository = repository;
        this.admin = new Conta(email, nome, senha, PerfilErp.ADMIN);
        this.funcionario = new Conta(funcEmail, funcNome, funcSenha, PerfilErp.FUNCIONARIO);
    }

    /** Atalho para testes: so o administrador. */
    public AdminInicial(UsuarioErpRepository repository, String email, String nome, String senha) {
        this(repository, email, nome, senha, "", "Funcionário", "");
    }

    // Roda antes de o servidor abrir a porta: ninguem consegue tentar o login antes do usuario existir
    @Override
    public void afterSingletonsInstantiated() {
        garantirAdmin();
    }

    public void garantirAdmin() {
        if (!garantir(admin)) {
            log.warn("ADMIN_SENHA nao definida (minimo 8 caracteres): o administrador do ERP nao foi criado/atualizado.");
        }
        if (!funcionario.email().isEmpty()) {
            if (funcionario.email().equals(admin.email())) {
                log.warn("FUNCIONARIO_EMAIL e igual ao ADMIN_EMAIL: o funcionario foi ignorado.");
            } else if (!garantir(funcionario)) {
                log.warn("FUNCIONARIO_SENHA nao definida (minimo 8 caracteres): o funcionario nao foi criado/atualizado.");
            }
        }

        if (!EMAIL_ANTIGO.equals(admin.email())) {
            repository.findByEmailIgnoreCase(EMAIL_ANTIGO).filter(UsuarioErp::isAtivo).ifPresent(antigo -> {
                antigo.setAtivo(false);
                repository.save(antigo);
                log.info("Administrador de exemplo {} desativado.", EMAIL_ANTIGO);
            });
        }
    }

    /** Cria ou atualiza a conta. Devolve false se faltar e-mail ou senha. */
    private boolean garantir(Conta c) {
        if (c.email().isEmpty() || c.senha() == null || c.senha().length() < 8) {
            return false;
        }
        UsuarioErp u = repository.findByEmailIgnoreCase(c.email()).orElse(null);
        if (u == null) {
            repository.save(new UsuarioErp(c.nome(), c.email(), encoder.encode(c.senha()), c.perfil()));
            log.info("Usuario do ERP criado ({}): {}", c.perfil(), c.email());
        } else if (!u.isAtivo() || u.getPerfil() != c.perfil() || !encoder.matches(c.senha(), u.getSenhaHash())) {
            u.setSenhaHash(encoder.encode(c.senha()));
            u.setPerfil(c.perfil());
            u.setAtivo(true);
            repository.save(u);
            log.info("Usuario do ERP atualizado ({}): {}", c.perfil(), c.email());
        }
        return true;
    }
}
