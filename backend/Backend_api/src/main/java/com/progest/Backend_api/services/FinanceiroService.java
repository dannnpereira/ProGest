package com.progest.Backend_api.services;

import com.progest.Backend_api.dto.*;
import com.progest.Backend_api.model.*;
import com.progest.Backend_api.repository.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

@Service
public class FinanceiroService {

    private final TransacaoFinanceiraRepository transacaoRepository;
    private final PedidosRepository pedidosRepository;

    public FinanceiroService(
            TransacaoFinanceiraRepository transacaoRepository,
            PedidosRepository pedidosRepository) {

        this.transacaoRepository = transacaoRepository;
        this.pedidosRepository = pedidosRepository;
    }

    // Registrar entrada ou saída
    @Transactional
    public TransacaoResponse registrarTransacao(
            TransacaoRequest request,
            TipoTransacao tipo) {

        if (request.descricao() == null ||
                request.descricao().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A descrição é obrigatória."
            );
        }

        if (request.valor() == null ||
                request.valor().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "O valor deve ser maior que zero."
            );
        }

        if (request.dataMovimentacao() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A data da movimentação é obrigatória."
            );
        }

        TransacaoFinanceira transacao =
                new TransacaoFinanceira();

        transacao.setTipo(tipo);
        transacao.setDescricao(request.descricao().trim());
        transacao.setValor(request.valor());
        transacao.setDataMovimentacao(
                request.dataMovimentacao()
        );

        // Relacionamento opcional com a OP
        if (request.op() != null) {

            Pedidos pedido = pedidosRepository.findById(
                    request.op()
            ).orElseThrow(() ->
                    new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Pedido não encontrado."
                    )
            );

            transacao.setPedido(pedido);
        }

        TransacaoFinanceira salva =
                transacaoRepository.save(transacao);

        return converterResposta(salva);
    }

    // Listar todas as movimentações
    public List<TransacaoResponse> listarTransacoes() {

        return transacaoRepository
                .findAllByOrderByDataMovimentacaoDescIdDesc()
                .stream()
                .map(this::converterResposta)
                .toList();
    }

    // Resumo de um mês
    public ResumoMensalResponse calcularResumo(
            YearMonth mes) {

        LocalDate inicio = mes.atDay(1);
        LocalDate fim = mes.atEndOfMonth();

        List<TransacaoFinanceira> transacoes =
                transacaoRepository
                        .findByDataMovimentacaoBetweenOrderByDataMovimentacaoAsc(
                                inicio, fim
                        );

        BigDecimal entradas = BigDecimal.ZERO;
        BigDecimal saidas = BigDecimal.ZERO;

        for (TransacaoFinanceira transacao : transacoes) {

            if (transacao.getTipo() == TipoTransacao.ENTRADA) {
                entradas = entradas.add(transacao.getValor());
            } else if (transacao.getTipo() == TipoTransacao.SAIDA) {
                saidas = saidas.add(transacao.getValor());
            }
        }

        return new ResumoMensalResponse(
                mes,
                entradas,
                saidas,
                entradas.subtract(saidas)
        );
    }

    // Comparar meses consecutivos
    public List<MesComparativoResponse> compararMeses(
            int quantidadeMeses) {

        if (quantidadeMeses < 1 || quantidadeMeses > 24) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Informe uma quantidade entre 1 e 24 meses."
            );
        }

        YearMonth mesAtual = YearMonth.now();
        YearMonth primeiroMes =
                mesAtual.minusMonths(quantidadeMeses - 1);

        List<ResumoMensalResponse> resumos =
                new ArrayList<>();

        for (int i = 0; i < quantidadeMeses; i++) {
            YearMonth mes = primeiroMes.plusMonths(i);
            resumos.add(calcularResumo(mes));
        }

        List<MesComparativoResponse> resultado =
                new ArrayList<>();

        for (int i = 0; i < resumos.size(); i++) {

            ResumoMensalResponse atual = resumos.get(i);

            BigDecimal variacaoEntradas = null;
            BigDecimal variacaoSaidas = null;

            if (i > 0) {

                ResumoMensalResponse anterior =
                        resumos.get(i - 1);

                variacaoEntradas = calcularVariacao(
                        atual.totalEntradas(),
                        anterior.totalEntradas()
                );

                variacaoSaidas = calcularVariacao(
                        atual.totalSaidas(),
                        anterior.totalSaidas()
                );
            }

            resultado.add(new MesComparativoResponse(
                    atual.mes(),
                    atual.totalEntradas(),
                    atual.totalSaidas(),
                    atual.saldoPeriodo(),
                    variacaoEntradas,
                    variacaoSaidas
            ));
        }

        return resultado;
    }

    // Variação percentual em relação ao mês anterior
    private BigDecimal calcularVariacao(
            BigDecimal atual,
            BigDecimal anterior) {

        if (anterior.compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }

        return atual.subtract(anterior)
                .multiply(BigDecimal.valueOf(100))
                .divide(anterior, 2, RoundingMode.HALF_UP);
    }

    private TransacaoResponse converterResposta(
            TransacaoFinanceira transacao) {

        Long op = transacao.getPedido() == null
                ? null
                : transacao.getPedido().getOp();

        return new TransacaoResponse(
                transacao.getId(),
                op,
                transacao.getTipo(),
                transacao.getDescricao(),
                transacao.getValor(),
                transacao.getDataMovimentacao()
        );
    }
}
