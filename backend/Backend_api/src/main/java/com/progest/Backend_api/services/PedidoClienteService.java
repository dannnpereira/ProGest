package com.progest.Backend_api.services;

import com.progest.Backend_api.dto.OrcamentoResponse;
import com.progest.Backend_api.dto.PedidoClienteRequest;
import com.progest.Backend_api.model.Cliente;
import com.progest.Backend_api.model.PedidoCliente;
import com.progest.Backend_api.model.StatusPedidoCliente;
import com.progest.Backend_api.model.Produto;
import com.progest.Backend_api.repository.PedidoClienteRepository;
import com.progest.Backend_api.repository.ProdutoRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import static com.progest.Backend_api.model.StatusPedidoCliente.*;

/**
 * Pedidos do site: o cliente cria, a Amaral aprova/recusa no ERP e a produção
 * avança as etapas. Não dá para pular etapa nem mexer em pedido de outro cliente.
 */
@Service
public class PedidoClienteService {

    public static final Set<StatusPedidoCliente> PRODUCAO = EnumSet.of(A_FAZER, EM_PROCESSO, ENTREGUE);
    private static final int PRAZO_PADRAO_DIAS = 7;
    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    private final PedidoClienteRepository pedidos;
    private final OrcamentoService orcamentos;
    private final ProdutoRepository produtos;

    public PedidoClienteService(PedidoClienteRepository pedidos, OrcamentoService orcamentos,
                                ProdutoRepository produtos) {
        this.pedidos = pedidos;
        this.orcamentos = orcamentos;
        this.produtos = produtos;
    }

    // ---------- Cliente ----------

    @Transactional
    public PedidoCliente criar(Cliente cliente, PedidoClienteRequest req) {
        if (req.entrega() && req.endereco() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Informe o CEP e o número do endereço de entrega.");
        }
        // Preço sempre do servidor (valores do ERP), nunca do navegador
        OrcamentoResponse o = orcamentos.calcular(req.comoOrcamento());

        PedidoCliente p = new PedidoCliente();
        p.setCliente(cliente);
        p.setCriadoEm(Instant.now());
        p.setStatus(AGUARDANDO_APROVACAO);
        p.setArame(req.arame());
        p.setMalha(req.malha());
        p.setTratamento(req.tratamento());
        p.setArameNome(nomeDoProduto(req.arame()));
        p.setMalhaNome(nomeDoProduto(req.malha()));
        p.setTratamentoNome(nomeDoProduto(req.tratamento()));
        p.setAlturaM(req.alturaM());
        p.setComprimentoM(req.comprimentoM());
        p.setEntrega(req.entrega());
        if (req.entrega()) {
            var e = req.endereco();
            p.setCep(e.cep());
            p.setCidade(e.cidade().trim());
            p.setUf(e.uf().trim().toUpperCase());
            p.setEndereco(formatarEndereco(e));
            p.setDistanciaKm(o.frete().distanciaKm());
        }
        p.setValorMateriaPrima(o.materiaPrima());
        p.setValorAcessorios(o.acessorios());
        p.setValorFrete(o.frete().valor());
        p.setValorDesconto(o.desconto());
        p.setValorTotal(o.total());
        p.setParcelas(o.parcelas());
        p.setValorParcela(o.valorParcela());

        p = pedidos.save(p);
        p.setCodigo("AM-" + (1000 + p.getId()));
        return pedidos.save(p);
    }

    public List<PedidoCliente> doCliente(Cliente cliente) {
        return pedidos.findByClienteIdOrderByCriadoEmDesc(cliente.getId());
    }

    // ---------- ERP: aprovação (administrador) ----------

    public List<PedidoCliente> todos() {
        return pedidos.findAllByOrderByCriadoEmDesc();
    }

    @Transactional
    public List<PedidoCliente> aprovar(List<Long> ids) {
        return ids.stream().map(id -> {
            PedidoCliente p = buscar(id);
            exigir(p, AGUARDANDO_APROVACAO);
            p.setStatus(A_FAZER);
            p.setAprovadoEm(Instant.now());
            p.setPrevisaoEntrega(LocalDate.now(FUSO).plusDays(PRAZO_PADRAO_DIAS));
            return pedidos.save(p);
        }).toList();
    }

    @Transactional
    public PedidoCliente recusar(Long id, String motivo) {
        PedidoCliente p = buscar(id);
        exigir(p, AGUARDANDO_APROVACAO);
        p.setStatus(RECUSADO);
        p.setRecusadoEm(Instant.now());
        p.setMotivoRecusa(motivo == null || motivo.isBlank() ? null : motivo.trim());
        return pedidos.save(p);
    }

    /** "Desfazer" da aprovação ou da recusa: o pedido volta para a fila. */
    @Transactional
    public PedidoCliente voltarParaFila(Long id) {
        PedidoCliente p = buscar(id);
        exigir(p, A_FAZER, RECUSADO);
        p.setStatus(AGUARDANDO_APROVACAO);
        p.setAprovadoEm(null);
        p.setRecusadoEm(null);
        p.setMotivoRecusa(null);
        p.setPrevisaoEntrega(null);
        return pedidos.save(p);
    }

    // ---------- ERP: produção (administrador e funcionário) ----------

    public List<PedidoCliente> emProducao() {
        return pedidos.findByStatusInOrderByCriadoEmDesc(PRODUCAO);
    }

    /** A fazer -> Em produção -> Entregue (uma etapa por vez). */
    @Transactional
    public PedidoCliente avancar(Long id) {
        PedidoCliente p = buscar(id);
        switch (p.getStatus()) {
            case A_FAZER -> { p.setStatus(EM_PROCESSO); p.setProducaoIniciadaEm(Instant.now()); }
            case EM_PROCESSO -> { p.setStatus(ENTREGUE); p.setEntregueEm(Instant.now()); }
            default -> throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Este pedido não pode avançar a partir de " + p.getStatus() + ".");
        }
        return pedidos.save(p);
    }

    /** "Desfazer" de um avanço na produção. */
    @Transactional
    public PedidoCliente voltarEtapa(Long id) {
        PedidoCliente p = buscar(id);
        switch (p.getStatus()) {
            case EM_PROCESSO -> { p.setStatus(A_FAZER); p.setProducaoIniciadaEm(null); }
            case ENTREGUE -> { p.setStatus(EM_PROCESSO); p.setEntregueEm(null); }
            default -> throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Este pedido não pode voltar a partir de " + p.getStatus() + ".");
        }
        return pedidos.save(p);
    }

    // ---------- Auxiliares ----------

    private PedidoCliente buscar(Long id) {
        return pedidos.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Pedido não encontrado."));
    }

    private static void exigir(PedidoCliente p, StatusPedidoCliente... permitidos) {
        for (StatusPedidoCliente s : permitidos) {
            if (p.getStatus() == s) {
                return;
            }
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT,
                "O pedido " + p.getCodigo() + " já foi atualizado por outra pessoa. Recarregue a tela.");
    }

    private String nomeDoProduto(String chave) {
        return produtos.findByChave(chave).map(Produto::getNome).orElse(chave);
    }

    private static String formatarEndereco(PedidoClienteRequest.Endereco e) {
        StringBuilder s = new StringBuilder(e.logradouro().trim()).append(", nº ").append(e.numero().trim());
        if (e.complemento() != null && !e.complemento().isBlank()) {
            s.append(" (").append(e.complemento().trim()).append(")");
        }
        if (e.bairro() != null && !e.bairro().isBlank()) {
            s.append(" - ").append(e.bairro().trim());
        }
        s.append(" - ").append(e.cidade().trim()).append("/").append(e.uf().trim().toUpperCase());
        return s.toString();
    }
}
