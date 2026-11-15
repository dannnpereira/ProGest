package com.progest.Backend_api.controller;

import com.progest.Backend_api.dto.PedidoErpResponse;
import com.progest.Backend_api.services.PedidoClienteService;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Pedidos do site no ERP.
 *  /api/erp/pedidos/**          -> Aprovação (só administrador)
 *  /api/erp/producao/pedidos/** -> Produção e Entregas (administrador e funcionário)
 * Quem pode o quê é decidido no ErpAuthInterceptor.
 */
@RestController
public class ErpPedidosController {

    private final PedidoClienteService pedidos;

    public ErpPedidosController(PedidoClienteService pedidos) {
        this.pedidos = pedidos;
    }

    public record AprovarRequest(@NotEmpty List<Long> ids) {
    }

    public record RecusarRequest(String motivo) {
    }

    // ---------- Aprovação ----------

    @GetMapping("/api/erp/pedidos")
    public List<PedidoErpResponse> todos() {
        return pedidos.todos().stream().map(PedidoErpResponse::de).toList();
    }

    @PostMapping("/api/erp/pedidos/aprovar")
    public List<PedidoErpResponse> aprovar(@Valid @RequestBody AprovarRequest req) {
        return pedidos.aprovar(req.ids()).stream().map(PedidoErpResponse::de).toList();
    }

    @PostMapping("/api/erp/pedidos/{id}/recusar")
    public PedidoErpResponse recusar(@PathVariable Long id, @RequestBody(required = false) RecusarRequest req) {
        return PedidoErpResponse.de(pedidos.recusar(id, req == null ? null : req.motivo()));
    }

    @PostMapping("/api/erp/pedidos/{id}/voltar-para-fila")
    public PedidoErpResponse voltarParaFila(@PathVariable Long id) {
        return PedidoErpResponse.de(pedidos.voltarParaFila(id));
    }

    // ---------- Produção ----------

    @GetMapping("/api/erp/producao/pedidos")
    public List<PedidoErpResponse> producao() {
        return pedidos.emProducao().stream().map(PedidoErpResponse::de).toList();
    }

    @PostMapping("/api/erp/producao/pedidos/{id}/avancar")
    public PedidoErpResponse avancar(@PathVariable Long id) {
        return PedidoErpResponse.de(pedidos.avancar(id));
    }

    @PostMapping("/api/erp/producao/pedidos/{id}/voltar")
    public PedidoErpResponse voltar(@PathVariable Long id) {
        return PedidoErpResponse.de(pedidos.voltarEtapa(id));
    }
}
