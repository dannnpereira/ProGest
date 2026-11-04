
package com.progest.Backend_api.controller;

import com.progest.Backend_api.model.Pedidos;
import com.progest.Backend_api.services.PedidosService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pedidos")
public class PedidosController {

    private final PedidosService pedidosService;

    public PedidosController(PedidosService pedidosService) {
        this.pedidosService = pedidosService;
    }

    // Cadastrar pedido e inserir automaticamente no workflow
    @PostMapping
    public ResponseEntity<Pedidos> cadastrarPedido(
            @RequestBody Pedidos pedido) {

        Pedidos novoPedido =
                pedidosService.cadastrarPedido(pedido);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(novoPedido);
    }
}
