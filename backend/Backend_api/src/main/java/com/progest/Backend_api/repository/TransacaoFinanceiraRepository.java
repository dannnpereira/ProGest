package com.progest.Backend_api.repository;

import com.progest.Backend_api.model.TransacaoFinanceira;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface TransacaoFinanceiraRepository
        extends JpaRepository<TransacaoFinanceira, Long> {

    List<TransacaoFinanceira>
        findByDataMovimentacaoBetweenOrderByDataMovimentacaoAsc(
            LocalDate inicio,
            LocalDate fim
        );

    List<TransacaoFinanceira>
        findAllByOrderByDataMovimentacaoDescIdDesc();
}
