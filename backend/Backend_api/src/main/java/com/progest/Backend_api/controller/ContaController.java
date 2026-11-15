package com.progest.Backend_api.controller;

import com.progest.Backend_api.config.ClienteAuthInterceptor;
import com.progest.Backend_api.dto.PedidoClienteRequest;
import com.progest.Backend_api.dto.PedidoClienteResponse;
import com.progest.Backend_api.dto.PerfilResponse;
import com.progest.Backend_api.model.Cliente;
import com.progest.Backend_api.services.PedidoClienteService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Área do cliente logado no site. O cliente vem do token (ClienteAuthInterceptor),
// nunca de um id enviado pelo navegador.
@RestController
@RequestMapping("/api/conta")
public class ContaController {

    private final PedidoClienteService pedidos;

    public ContaController(PedidoClienteService pedidos) {
        this.pedidos = pedidos;
    }

    @GetMapping
    public PerfilResponse perfil(@RequestAttribute(ClienteAuthInterceptor.ATRIBUTO_CLIENTE) Cliente cliente) {
        return PerfilResponse.de(cliente);
    }

    @GetMapping("/pedidos")
    public List<PedidoClienteResponse> meusPedidos(@RequestAttribute(ClienteAuthInterceptor.ATRIBUTO_CLIENTE) Cliente cliente) {
        return pedidos.doCliente(cliente).stream().map(PedidoClienteResponse::de).toList();
    }

    @PostMapping("/pedidos")
    @ResponseStatus(HttpStatus.CREATED)
    public PedidoClienteResponse fazerPedido(@RequestAttribute(ClienteAuthInterceptor.ATRIBUTO_CLIENTE) Cliente cliente,
                                             @Valid @RequestBody PedidoClienteRequest req) {
        return PedidoClienteResponse.de(pedidos.criar(cliente, req));
    }
}
