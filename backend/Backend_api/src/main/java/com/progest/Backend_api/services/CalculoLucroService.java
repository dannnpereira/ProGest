package com.progest.Backend_api.services;

import com.progest.Backend_api.dto.CalculoLucroResponse;
import com.progest.Backend_api.model.TipoTransacao;
import com.progest.Backend_api.model.TransacaoFinanceira;
import com.progest.Backend_api.repository.TransacaoFinanceiraRepository;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.List;

@Service
public class CalculoLucroService {

    private final TransacaoFinanceiraRepository transacaoRepository;

    public CalculoLucroService(
            TransacaoFinanceiraRepository transacaoRepository) {
        this.transacaoRepository = transacaoRepository;
    }

    public CalculoLucroResponse calcularLucro(YearMonth mes) {

        if (mes == null) {
            throw new IllegalArgumentException(
                "O mês deve ser informado."
            );
        }

        List<TransacaoFinanceira> transacoes =
            transacaoRepository
                .findByDataMovimentacaoBetweenOrderByDataMovimentacaoAsc(
                    mes.atDay(1),
                    mes.atEndOfMonth()
                );

        BigDecimal entradas = transacoes.stream()
            .filter(t -> t.getTipo() == TipoTransacao.ENTRADA)
            .map(TransacaoFinanceira::getValor)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal saidas = transacoes.stream()
            .filter(t -> t.getTipo() == TipoTransacao.SAIDA)
            .map(TransacaoFinanceira::getValor)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal lucro = entradas.subtract(saidas);

        BigDecimal margem = BigDecimal.ZERO;

        if (entradas.compareTo(BigDecimal.ZERO) > 0) {
            margem = lucro
                .multiply(BigDecimal.valueOf(100))
                .divide(entradas, 2, RoundingMode.HALF_UP);
        }

        return new CalculoLucroResponse(
            mes,
            entradas,
            saidas,
            lucro,
            margem
        );
    }
}