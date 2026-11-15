package com.progest.Backend_api.config;

import com.progest.Backend_api.model.UsuarioErp;
import com.progest.Backend_api.repository.UsuarioErpRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Garante, ao iniciar, que o administrador do ERP exista com o e-mail e a senha
 * configurados (progest.admin.*, vindos de ADMIN_EMAIL / ADMIN_NOME / ADMIN_SENHA).
 *
 * - Nao existe: cria.
 * - Existe com outra senha: atualiza para a senha configurada.
 *   (Para trocar a senha, basta mudar ADMIN_SENHA e reiniciar.)
 * - Sem ADMIN_SENHA: nao mexe em nada e avisa no log.
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
    private final String email;
    private final String nome;
    private final String senha;

    public AdminInicial(UsuarioErpRepository repository,
                        @Value("${progest.admin.email}") String email,
                        @Value("${progest.admin.nome}") String nome,
                        @Value("${progest.admin.senha:}") String senha) {
        this.repository = repository;
        this.email = email == null ? "" : email.trim().toLowerCase();
        this.nome = nome;
        this.senha = senha;
    }

    @Override
    public void afterSingletonsInstantiated() {
        garantirAdmin();
    }

    // Roda antes de o servidor abrir a porta: ninguem consegue tentar o login antes do admin existir
    public void garantirAdmin() {
        if (senha == null || senha.length() < 8) {
            log.warn("ADMIN_SENHA nao definida (minimo 8 caracteres): o administrador do ERP nao foi criado/atualizado.");
            return;
        }

        UsuarioErp admin = repository.findByEmailIgnoreCase(email).orElse(null);
        if (admin == null) {
            repository.save(new UsuarioErp(nome, email, encoder.encode(senha)));
            log.info("Administrador do ERP criado: {}", email);
        } else if (!admin.isAtivo() || !encoder.matches(senha, admin.getSenhaHash())) {
            admin.setSenhaHash(encoder.encode(senha));
            admin.setAtivo(true);
            repository.save(admin);
            log.info("Senha do administrador do ERP atualizada: {}", email);
        }

        if (!EMAIL_ANTIGO.equals(email)) {
            repository.findByEmailIgnoreCase(EMAIL_ANTIGO).filter(UsuarioErp::isAtivo).ifPresent(antigo -> {
                antigo.setAtivo(false);
                repository.save(antigo);
                log.info("Administrador de exemplo {} desativado.", EMAIL_ANTIGO);
            });
        }
    }
}
