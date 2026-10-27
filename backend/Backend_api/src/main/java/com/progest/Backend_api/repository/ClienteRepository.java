package com.progest.Backend_api.repository;

import com.progest.Backend_api.model.Cliente;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;


public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    Optional<Cliente> findByCpf(Long id);
}