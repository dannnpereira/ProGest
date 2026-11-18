package com.progest.Backend_api.repository;

import com.progest.Backend_api.model.Produto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProdutoRepository extends JpaRepository<Produto, Long> {

    /** Produtos da tela do ERP (sem os excluidos) */
    List<Produto> findByExcluidoFalseOrderByIdAsc();

    /** Produtos que aparecem no site e entram no orcamento */
    List<Produto> findByAtivoTrueAndExcluidoFalseOrderByIdAsc();

    /** Inclui excluidos: usado para gravar o nome do produto no pedido */
    Optional<Produto> findByChave(String chave);
}
