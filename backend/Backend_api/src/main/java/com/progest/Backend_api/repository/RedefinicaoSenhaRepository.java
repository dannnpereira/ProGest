package com.progest.Backend_api.repository;

import com.progest.Backend_api.model.RedefinicaoSenha;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface RedefinicaoSenhaRepository extends JpaRepository<RedefinicaoSenha, Long> {

    Optional<RedefinicaoSenha> findByTokenHash(String tokenHash);

    /** Links ainda não usados do cliente (para cancelar quando sai um novo ou a senha muda). */
    List<RedefinicaoSenha> findByClienteIdAndUsadoEmIsNull(Long clienteId);

    /** Pedidos recentes do cliente pelo site (limite contra envio de e-mails em massa). */
    long countByClienteIdAndOrigemAndCriadoEmAfter(Long clienteId, RedefinicaoSenha.Origem origem, Instant desde);
}
