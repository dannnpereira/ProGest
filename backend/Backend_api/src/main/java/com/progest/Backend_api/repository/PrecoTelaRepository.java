package com.progest.Backend_api.repository;

import com.progest.Backend_api.model.PrecoTela;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrecoTelaRepository extends JpaRepository<PrecoTela, Long> {

    List<PrecoTela> findByExcluidoFalseOrderByIdAsc();
}
