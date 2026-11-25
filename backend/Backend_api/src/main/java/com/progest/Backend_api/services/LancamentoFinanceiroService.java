package com.progest.Backend_api.services;

import com.progest.Backend_api.dto.LancamentoDto;
import com.progest.Backend_api.model.LancamentoFinanceiro;
import com.progest.Backend_api.model.TipoLancamento;
import com.progest.Backend_api.repository.LancamentoFinanceiroRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

/** Compras de material, saídas e entradas avulsas do Financeiro do ERP. */
@Service
public class LancamentoFinanceiroService {

    private final LancamentoFinanceiroRepository lancamentos;

    public LancamentoFinanceiroService(LancamentoFinanceiroRepository lancamentos) {
        this.lancamentos = lancamentos;
    }

    public List<LancamentoFinanceiro> listar(LocalDate de, LocalDate ate) {
        if (de.isAfter(ate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Período inválido.");
        }
        return lancamentos.findByDataBetweenOrderByDataDescIdDesc(de, ate);
    }

    @Transactional
    public LancamentoFinanceiro criar(LancamentoDto req) {
        LancamentoFinanceiro l = new LancamentoFinanceiro();
        preencher(l, req);
        return lancamentos.save(l);
    }

    @Transactional
    public LancamentoFinanceiro atualizar(Long id, LancamentoDto req) {
        LancamentoFinanceiro l = buscar(id);
        preencher(l, req);
        return lancamentos.save(l);
    }

    @Transactional
    public void excluir(Long id) {
        lancamentos.delete(buscar(id));
    }

    private LancamentoFinanceiro buscar(Long id) {
        return lancamentos.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Lançamento não encontrado."));
    }

    private static void preencher(LancamentoFinanceiro l, LancamentoDto req) {
        if (req.tipo() == null) {
            throw invalido("Informe o tipo do lançamento.");
        }
        if (req.data() == null) {
            throw invalido("Informe a data.");
        }
        String descricao = limpar(req.descricao());
        if (descricao == null || descricao.length() < 2) {
            throw invalido(req.tipo() == TipoLancamento.COMPRA ? "Informe o material." : "Informe a descrição.");
        }
        if (req.valor() == null || req.valor().signum() <= 0) {
            throw invalido("Informe um valor maior que zero.");
        }
        if (req.status() == null) {
            throw invalido("Informe o status.");
        }
        String favorecido = limpar(req.favorecido());
        if (req.tipo() == TipoLancamento.COMPRA && (favorecido == null || favorecido.length() < 2)) {
            throw invalido("Informe o fornecedor.");
        }
        if (req.tipo() == TipoLancamento.DESPESA && req.categoria() == null) {
            throw invalido("Selecione a categoria da saída.");
        }

        l.setTipo(req.tipo());
        l.setData(req.data());
        l.setCategoria(req.tipo() == TipoLancamento.DESPESA ? req.categoria() : null);
        l.setDescricao(cortar(descricao, 255));
        l.setFavorecido(cortar(favorecido, 150));
        l.setQuantidade(req.tipo() == TipoLancamento.COMPRA ? cortar(limpar(req.quantidade()), 100) : null);
        l.setValor(req.valor().setScale(2, RoundingMode.HALF_UP));
        l.setStatus(req.status());
    }

    private static String limpar(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String cortar(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }

    private static ResponseStatusException invalido(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}
