package com.progest.Backend_api.repository;

import com.progest.Backend_api.model.LancamentoFinanceiro;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface LancamentoFinanceiroRepository extends JpaRepository<LancamentoFinanceiro, Long> {

    List<LancamentoFinanceiro> findByDataBetweenOrderByDataDescIdDesc(LocalDate inicio, LocalDate fim);
}
