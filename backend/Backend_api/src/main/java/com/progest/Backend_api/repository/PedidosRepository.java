package com.progest.Backend_api.repository;

import com.progest.Backend_api.model.Pedidos;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PedidosRepository
        extends JpaRepository<Pedidos, Long> {
}
