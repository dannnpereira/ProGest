package com.progest.Backend_api.controller;

import com.progest.Backend_api.dto.LancamentoDto;
import com.progest.Backend_api.dto.PedidoErpResponse;
import com.progest.Backend_api.model.FormaPagamento;
import com.progest.Backend_api.services.LancamentoFinanceiroService;
import com.progest.Backend_api.services.PedidoClienteService;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Financeiro do ERP (só administrador, ver ErpAuthInterceptor).
 *  /api/erp/financeiro/lancamentos/** -> compras de material, saídas e entradas avulsas
 *  /api/erp/pedidos/{id}/pagamento     -> contas a receber (pagamento e estorno do pedido)
 */
@RestController
public class ErpFinanceiroController {

    private final LancamentoFinanceiroService lancamentos;
    private final PedidoClienteService pedidos;

    public ErpFinanceiroController(LancamentoFinanceiroService lancamentos, PedidoClienteService pedidos) {
        this.lancamentos = lancamentos;
        this.pedidos = pedidos;
    }

    public record PagamentoRequest(LocalDate data, FormaPagamento forma) {
    }

    // ---------- Lançamentos ----------

    @GetMapping("/api/erp/financeiro/lancamentos")
    public List<LancamentoDto> listar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        return lancamentos.listar(de, ate).stream().map(LancamentoDto::de).toList();
    }

    @PostMapping("/api/erp/financeiro/lancamentos")
    @ResponseStatus(HttpStatus.CREATED)
    public LancamentoDto criar(@RequestBody LancamentoDto req) {
        return LancamentoDto.de(lancamentos.criar(req));
    }

    @PutMapping("/api/erp/financeiro/lancamentos/{id}")
    public LancamentoDto atualizar(@PathVariable Long id, @RequestBody LancamentoDto req) {
        return LancamentoDto.de(lancamentos.atualizar(id, req));
    }

    @DeleteMapping("/api/erp/financeiro/lancamentos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        lancamentos.excluir(id);
    }

    // ---------- Contas a receber ----------

    @PostMapping("/api/erp/pedidos/{id}/pagamento")
    public PedidoErpResponse registrarPagamento(@PathVariable Long id, @RequestBody PagamentoRequest req) {
        return PedidoErpResponse.de(pedidos.registrarPagamento(id, req.data(), req.forma()));
    }

    @DeleteMapping("/api/erp/pedidos/{id}/pagamento")
    public PedidoErpResponse estornarPagamento(@PathVariable Long id) {
        return PedidoErpResponse.de(pedidos.estornarPagamento(id));
    }
}
