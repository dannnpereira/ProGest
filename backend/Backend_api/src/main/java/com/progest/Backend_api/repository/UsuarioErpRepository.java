package com.progest.Backend_api.repository;

import com.progest.Backend_api.model.UsuarioErp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioErpRepository extends JpaRepository<UsuarioErp, Long> {

    Optional<UsuarioErp> findByEmailIgnoreCase(String email);
}
