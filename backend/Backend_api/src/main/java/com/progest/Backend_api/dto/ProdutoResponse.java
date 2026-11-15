package com.progest.Backend_api.dto;

import com.progest.Backend_api.model.CategoriaProduto;
import com.progest.Backend_api.model.Produto;
import com.progest.Backend_api.model.UnidadeProduto;

import java.math.BigDecimal;

public record ProdutoResponse(
        Long id,
        String chave,
        CategoriaProduto categoria,
        String nome,
        String descricao,
        UnidadeProduto unidade,
        BigDecimal valor,
        boolean ativo
) {
    public static ProdutoResponse de(Produto p) {
        return new ProdutoResponse(p.getId(), p.getChave(), p.getCategoria(), p.getNome(),
                p.getDescricao(), p.getUnidade(), p.getValor(), p.isAtivo());
    }
}
