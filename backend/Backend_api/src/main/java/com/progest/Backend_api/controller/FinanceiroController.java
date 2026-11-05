package com.progest.Backend_api.controller;

import com.progest.Backend_api.dto.*;
import com.progest.Backend_api.model.TipoTransacao;
import com.progest.Backend_api.services.FinanceiroService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/financeiro")
public class FinanceiroController {

    private final FinanceiroService financeiroService;

    public FinanceiroController(
            FinanceiroService financeiroService) {
        this.financeiroService = financeiroService;
    }

    // Registrar entrada
    @PostMapping("/entradas")
    public ResponseEntity<TransacaoResponse> registrarEntrada(
            @RequestBody TransacaoRequest request) {

        TransacaoResponse resposta =
                financeiroService.registrarTransacao(
                        request,
                        TipoTransacao.ENTRADA
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(resposta);
    }

    // Registrar saída
    @PostMapping("/saidas")
    public ResponseEntity<TransacaoResponse> registrarSaida(
            @RequestBody TransacaoRequest request) {

        TransacaoResponse resposta =
                financeiroService.registrarTransacao(
                        request,
                        TipoTransacao.SAIDA
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(resposta);
    }

    // Listar movimentações
    @GetMapping("/transacoes")
    public ResponseEntity<List<TransacaoResponse>>
            listarTransacoes() {

        return ResponseEntity.ok(
                financeiroService.listarTransacoes()
        );
    }

    // Resumo mensal
    @GetMapping("/resumo")
    public ResponseEntity<ResumoMensalResponse> resumoMensal(
            @RequestParam(required = false) String mes) {

        YearMonth periodo = mes == null || mes.isBlank()
                ? YearMonth.now()
                : YearMonth.parse(mes);

        return ResponseEntity.ok(
                financeiroService.calcularResumo(periodo)
        );
    }

    // Comparativo de meses
    @GetMapping("/comparativo")
    public ResponseEntity<List<MesComparativoResponse>>
            compararMeses(
                    @RequestParam(defaultValue = "6")
                    int quantidadeMeses) {

        return ResponseEntity.ok(
                financeiroService.compararMeses(
                        quantidadeMeses
                )
        );
    }
}
