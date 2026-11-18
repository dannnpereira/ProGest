package com.progest.Backend_api.services;

import com.progest.Backend_api.dto.PrecoTelaRequest;
import com.progest.Backend_api.dto.PrecoTelaResponse;
import com.progest.Backend_api.model.CategoriaProduto;
import com.progest.Backend_api.model.PrecoTela;
import com.progest.Backend_api.model.UnidadePreco;
import com.progest.Backend_api.repository.PrecoTelaRepository;
import com.progest.Backend_api.repository.ProdutoRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;

/** Tabela de precos (tela por m2 e arame por kg), editada na tela "Produtos e Valores" do ERP. */
@Service
public class PrecoTelaService {

    private final PrecoTelaRepository precos;
    private final ProdutoRepository produtos;
    private final CatalogoService catalogo;

    public PrecoTelaService(PrecoTelaRepository precos, ProdutoRepository produtos, CatalogoService catalogo) {
        this.precos = precos;
        this.produtos = produtos;
        this.catalogo = catalogo;
    }

    public List<PrecoTelaResponse> listar() {
        return precos.findByExcluidoFalseOrderByIdAsc().stream().map(PrecoTelaResponse::de).toList();
    }

    @Transactional
    public PrecoTelaResponse criar(PrecoTelaRequest req) {
        PrecoTela p = new PrecoTela();
        aplicar(p, req);
        return PrecoTelaResponse.de(precos.save(p));
    }

    @Transactional
    public PrecoTelaResponse atualizar(Long id, PrecoTelaRequest req) {
        PrecoTela p = buscar(id);
        aplicar(p, req);
        p = precos.saveAndFlush(p);
        catalogo.garantirTelaNoSite();
        return PrecoTelaResponse.de(p);
    }

    /** Some do ERP e do site; a linha fica no banco para nao ser recriada pelos valores iniciais. */
    @Transactional
    public void excluir(Long id) {
        PrecoTela p = buscar(id);
        p.setExcluido(true);
        precos.saveAndFlush(p);
        catalogo.garantirTelaNoSite();
    }

    private PrecoTela buscar(Long id) {
        return precos.findById(id).filter(p -> !p.isExcluido()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Preço não encontrado."));
    }

    private void aplicar(PrecoTela p, PrecoTelaRequest req) {
        String malha = req.malha() == null || req.malha().isBlank() ? null : req.malha().trim();
        if (req.unidade() == UnidadePreco.M2 && malha == null) {
            throw invalido("Escolha a malha da tela.");
        }
        if (req.unidade() == UnidadePreco.KG) {
            malha = null; // arame avulso nao tem malha
        }
        exigirProduto(req.arame(), CategoriaProduto.ARAME, "um arame");
        if (malha != null) exigirProduto(malha, CategoriaProduto.MALHA, "uma malha");
        exigirProduto(req.tratamento(), CategoriaProduto.TRATAMENTO, "um tipo (tratamento)");

        final String m = malha;
        boolean repetida = precos.findByExcluidoFalseOrderByIdAsc().stream().anyMatch(o ->
                !Objects.equals(o.getId(), p.getId()) && o.getUnidade() == req.unidade()
                        && o.getArame().equals(req.arame()) && Objects.equals(o.getMalha(), m)
                        && o.getTratamento().equals(req.tratamento()));
        if (repetida) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Já existe um preço para esta combinação. Edite a linha existente.");
        }

        p.setArame(req.arame());
        p.setMalha(malha);
        p.setTratamento(req.tratamento());
        p.setUnidade(req.unidade());
        p.setPesoKgM2(req.pesoKgM2());
        p.setValorVista(req.valorVista());
        p.setValorPrazo(req.valorPrazo());
    }

    private void exigirProduto(String chave, CategoriaProduto categoria, String nome) {
        boolean ok = produtos.findByChave(chave)
                .filter(p -> !p.isExcluido() && p.getCategoria() == categoria).isPresent();
        if (!ok) throw invalido("Escolha " + nome + " cadastrado em Produtos e Valores.");
    }

    private static ResponseStatusException invalido(String msg) {
        return new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, msg);
    }
}
