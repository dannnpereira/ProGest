package com.progest.Backend_api.services;

import com.progest.Backend_api.dto.ProdutoRequest;
import com.progest.Backend_api.dto.ProdutoResponse;
import com.progest.Backend_api.dto.RegrasOrcamentoDto;
import com.progest.Backend_api.model.Produto;
import com.progest.Backend_api.model.RegrasOrcamento;
import com.progest.Backend_api.repository.ProdutoRepository;
import com.progest.Backend_api.repository.RegrasOrcamentoRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ProdutoService {

    private final ProdutoRepository produtos;
    private final RegrasOrcamentoRepository regras;
    private final CatalogoService catalogo;

    public ProdutoService(ProdutoRepository produtos, RegrasOrcamentoRepository regras, CatalogoService catalogo) {
        this.produtos = produtos;
        this.regras = regras;
        this.catalogo = catalogo;
    }

    public List<ProdutoResponse> listar() {
        return produtos.findByExcluidoFalseOrderByIdAsc().stream().map(ProdutoResponse::de).toList();
    }

    @Transactional
    public ProdutoResponse criar(ProdutoRequest req) {
        Produto p = new Produto();
        aplicar(p, req);
        p = produtos.save(p);
        // Chave que liga o produto a uma opcao do configurador do site
        p.setChave("PROD_" + p.getId());
        return ProdutoResponse.de(produtos.save(p));
    }

    @Transactional
    public ProdutoResponse atualizar(Long id, ProdutoRequest req) {
        Produto p = buscar(id);
        aplicar(p, req);
        p = produtos.saveAndFlush(p);
        catalogo.garantirTelaNoSite();
        return ProdutoResponse.de(p);
    }

    /**
     * Some do ERP e do site. A linha continua no banco (marcada como excluida) para
     * os pedidos antigos e para o produto padrao nao ser recriado ao reiniciar.
     */
    @Transactional
    public void excluir(Long id) {
        Produto p = buscar(id);
        p.setExcluido(true);
        p.setAtivo(false);
        produtos.saveAndFlush(p);
        catalogo.garantirTelaNoSite();
    }

    private Produto buscar(Long id) {
        return produtos.findById(id).filter(p -> !p.isExcluido()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Produto não encontrado."));
    }

    public RegrasOrcamentoDto buscarRegras() {
        return RegrasOrcamentoDto.de(regrasAtuais());
    }

    @Transactional
    public RegrasOrcamentoDto salvarRegras(RegrasOrcamentoDto dto) {
        RegrasOrcamento r = regrasAtuais();
        r.setDescontoAVistaPct(dto.descontoAVistaPct());
        r.setParcelasMax(dto.parcelasMax());
        return RegrasOrcamentoDto.de(regras.save(r));
    }

    private RegrasOrcamento regrasAtuais() {
        return regras.findById(RegrasOrcamento.ID_UNICO).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Regras do orçamento não configuradas."));
    }

    private static void aplicar(Produto p, ProdutoRequest req) {
        p.setCategoria(req.categoria());
        p.setNome(req.nome().trim());
        p.setDescricao(req.descricao() == null ? null : req.descricao().trim());
        p.setUnidade(req.unidade());
        p.setValor(req.valor());
        p.setAtivo(req.ativo());
    }
}
