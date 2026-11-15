package com.progest.Backend_api.repository;

import com.progest.Backend_api.model.PedidoCliente;
import com.progest.Backend_api.model.StatusPedidoCliente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface PedidoClienteRepository extends JpaRepository<PedidoCliente, Long> {

    List<PedidoCliente> findByClienteIdOrderByCriadoEmDesc(Long clienteId);

    List<PedidoCliente> findAllByOrderByCriadoEmDesc();

    List<PedidoCliente> findByStatusInOrderByCriadoEmDesc(Collection<StatusPedidoCliente> status);
}
