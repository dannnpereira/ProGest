package com.progest.Backend_api.services;

import com.progest.Backend_api.dto.CatalogoItem;
import com.progest.Backend_api.dto.CombinacaoItem;
import com.progest.Backend_api.model.CategoriaProduto;
import com.progest.Backend_api.model.PrecoTela;
import com.progest.Backend_api.model.Produto;
import com.progest.Backend_api.model.UnidadePreco;
import com.progest.Backend_api.repository.PrecoTelaRepository;
import com.progest.Backend_api.repository.ProdutoRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * O que o cliente pode escolher no site: as telas (M2) da tabela de precos cujo
 * arame, malha e tratamento estao ativos em "Produtos e Valores".
 */
@Service
public class CatalogoService {

    private final ProdutoRepository produtos;
    private final PrecoTelaRepository precos;

    public CatalogoService(ProdutoRepository produtos, PrecoTelaRepository precos) {
        this.produtos = produtos;
        this.precos = precos;
    }

    private Map<String, Produto> ativosPorChave() {
        return produtos.findByAtivoTrueAndExcluidoFalseOrderByIdAsc().stream()
                .filter(p -> p.getChave() != null)
                .collect(Collectors.toMap(Produto::getChave, Function.identity()));
    }

    /** Telas com preco cadastrado e os tres produtos ativos, cada um na categoria certa. */
    public List<PrecoTela> telasDisponiveis() {
        Map<String, Produto> ativos = ativosPorChave();
        return precos.findByExcluidoFalseOrderByIdAsc().stream()
                .filter(t -> t.getUnidade() == UnidadePreco.M2)
                .filter(t -> eh(ativos, t.getArame(), CategoriaProduto.ARAME)
                        && eh(ativos, t.getMalha(), CategoriaProduto.MALHA)
                        && eh(ativos, t.getTratamento(), CategoriaProduto.TRATAMENTO))
                .toList();
    }

    public Optional<PrecoTela> tela(String arame, String malha, String tratamento) {
        return telasDisponiveis().stream()
                .filter(t -> t.getArame().equals(arame) && t.getMalha().equals(malha)
                        && t.getTratamento().equals(tratamento))
                .findFirst();
    }

    public List<CombinacaoItem> combinacoes() {
        return telasDisponiveis().stream().map(CombinacaoItem::de).toList();
    }

    /** Arames, malhas e tratamentos que fazem parte de alguma combinacao, e os acessorios ativos. */
    public List<CatalogoItem> itens() {
        Set<String> usados = new HashSet<>();
        for (PrecoTela t : telasDisponiveis()) {
            usados.add(t.getArame());
            usados.add(t.getMalha());
            usados.add(t.getTratamento());
        }
        return produtos.findByAtivoTrueAndExcluidoFalseOrderByIdAsc().stream()
                .filter(p -> p.getChave() != null)
                .filter(p -> p.getCategoria() == CategoriaProduto.ACESSORIOS || usados.contains(p.getChave()))
                .map(CatalogoItem::de).toList();
    }

    /** Recusa (e desfaz, pela transacao de quem chamou) a mudanca que deixaria o site sem nenhuma tela. */
    public void garantirTelaNoSite() {
        if (telasDisponiveis().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "O site precisa de pelo menos uma tela disponível (arame, malha e tratamento ativos "
                            + "com preço na tabela). Cadastre ou ative outra antes de desativar ou excluir esta.");
        }
    }

    private static boolean eh(Map<String, Produto> ativos, String chave, CategoriaProduto categoria) {
        Produto p = chave == null ? null : ativos.get(chave);
        return p != null && p.getCategoria() == categoria;
    }
}
