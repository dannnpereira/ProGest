package com.progest.Backend_api.dto;

import com.progest.Backend_api.model.CategoriaProduto;
import com.progest.Backend_api.model.Produto;

/**
 * Opcao do configurador do site (GET /api/catalogo). Sem preco: o site pede o
 * orcamento pronto em /api/orcamento.
 */
public record CatalogoItem(String chave, CategoriaProduto categoria, String nome, String descricao) {

    public static CatalogoItem de(Produto p) {
        return new CatalogoItem(p.getChave(), p.getCategoria(), p.getNome(), p.getDescricao());
    }
}
