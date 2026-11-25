package com.progest.Backend_api.config;

import com.progest.Backend_api.model.CategoriaDespesa;
import com.progest.Backend_api.model.FormaPagamento;
import com.progest.Backend_api.model.LancamentoFinanceiro;
import com.progest.Backend_api.model.PedidoCliente;
import com.progest.Backend_api.model.StatusLancamento;
import com.progest.Backend_api.model.StatusPedidoCliente;
import com.progest.Backend_api.model.TipoLancamento;
import com.progest.Backend_api.repository.LancamentoFinanceiroRepository;
import com.progest.Backend_api.repository.PedidoClienteRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import static com.progest.Backend_api.model.CategoriaDespesa.*;
import static com.progest.Backend_api.model.StatusLancamento.*;

/**
 * Financeiro de APRESENTACAO: 6 meses (o atual e os 5 anteriores) de compras de material,
 * saidas (folha, encargos, aluguel, energia, agua, IPTU, IPVA, DAS, frete, diesel, internet)
 * e vendas diretas, mais o pagamento dos pedidos de demonstracao mais antigos.
 *
 * Roda junto com o DadosDemo (DEMO_DADOS=true), uma vez so por banco (marca propria na
 * tabela migracoes, para bancos que ja tinham recebido os pedidos de demonstracao).
 * Depois disso tudo e editado pelo ERP. Fornecedores e clientes sao ficticios.
 */
@Component
public class DadosDemoFinanceiro {

    private static final Logger log = LoggerFactory.getLogger(DadosDemoFinanceiro.class);
    static final String MARCA = "dados_demo_financeiro";
    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    /** Movimento de cada mes (do mais antigo ao atual), relativo ao mes atual */
    private static final double[] FATOR = {0.765, 0.828, 0.902, 0.864, 0.950, 1.0};

    /** Pedidos aprovados ha mais que isso ja foram pagos pelo cliente (os mais novos ficam em aberto) */
    private static final Duration PAGOS_ATE = Duration.ofDays(20);

    private final JdbcTemplate jdbc;
    private final LancamentoFinanceiroRepository lancamentos;
    private final PedidoClienteRepository pedidos;

    public DadosDemoFinanceiro(JdbcTemplate jdbc, LancamentoFinanceiroRepository lancamentos,
                               PedidoClienteRepository pedidos) {
        this.jdbc = jdbc;
        this.lancamentos = lancamentos;
        this.pedidos = pedidos;
    }

    // [dia, fornecedor, material, quantidade, valor, status no mes atual]
    private record Compra(int dia, String fornecedor, String material, String quantidade, long valor, StatusLancamento status) {}

    private static final List<Compra> COMPRAS = List.of(
            new Compra(23, "Siderúrgica Nova Era", "Arame galvanizado a fogo Fio 12", "15 bobinas (4,5 ton)", 42500, PAGO),
            new Compra(21, "Mourões Sorocaba", "Mourões concreto curvos 2,50 m", "120 unidades", 18200, PAGO),
            new Compra(18, "Aços Paulista Distribuidora", "Arame Fio 14 galvanizado", "8 bobinas (2,4 ton)", 26800, A_PAGAR),
            new Compra(15, "Metalúrgica Fixaço", "Acessórios de fixação / catracas nº 2", "250 conjuntos", 8400, A_PAGAR),
            new Compra(8, "Arames Brasil Sul", "Arame revestido PVC verde", "5 bobinas (1,2 ton)", 14100, ATRASADO)
    );

    /** varia = acompanha o movimento da fabrica; os fixos ficam iguais todo mes */
    private record Despesa(int dia, CategoriaDespesa categoria, String descricao, String favorecido, long valor,
                           boolean varia, StatusLancamento status) {}

    private static final List<Despesa> DESPESAS = List.of(
            new Despesa(5, SALARIOS, "Salários – equipe de produção (8 funcionários)", "Folha de pagamento", 24800, false, PAGO),
            new Despesa(5, SALARIOS, "Salários – administrativo e vendas (3 funcionários)", "Folha de pagamento", 11400, false, PAGO),
            new Despesa(7, ENCARGOS, "FGTS dos funcionários", "Caixa Econômica Federal", 2900, false, PAGO),
            new Despesa(10, ALUGUEL, "Aluguel do galpão industrial", "Imobiliária Horizonte", 9500, false, PAGO),
            new Despesa(12, ENERGIA, "Energia elétrica – teares e solda (trifásica)", "Distribuidora de energia", 6800, true, A_PAGAR),
            new Despesa(12, AGUA, "Água e esgoto", "Saneamento municipal", 520, false, PAGO),
            new Despesa(15, IMPOSTOS, "IPTU do galpão", "Prefeitura Municipal", 1180, false, ATRASADO),
            new Despesa(18, VEICULOS, "IPVA da frota – Toco e Truck (provisão mensal)", "Secretaria da Fazenda", 1650, false, PAGO),
            new Despesa(20, ENCARGOS, "INSS sobre a folha", "Receita Federal", 4300, false, A_PAGAR),
            new Despesa(20, IMPOSTOS, "DAS / ICMS do mês", "Receita Federal", 11300, true, A_PAGAR),
            new Despesa(21, FRETE, "Frete técnico – Caminhão Munck", "Transportes Rodoserra", 4500, true, PAGO),
            new Despesa(24, VEICULOS, "Diesel da frota", "Posto Rota 270", 3600, true, PAGO),
            new Despesa(26, OUTROS, "Internet e telefonia", "Provedor local", 390, false, PAGO)
    );

    private record Entrada(int dia, String descricao, String origem, long valor) {}

    /** Vendas fechadas fora do site (obras, revendas), ja recebidas */
    private static final List<Entrada> ENTRADAS = List.of(
            new Entrada(24, "Venda direta – Construtora Horizonte Sul (obra Jardim Itanguá)", "Transferência TED", 58400),
            new Entrada(22, "Venda direta – Sítio Boa Vista (cercamento rural)", "PIX", 41200),
            new Entrada(18, "Venda direta – Clube Recreativo Vila Nova (quadra poliesportiva)", "Transferência TED", 64800),
            new Entrada(12, "Venda balcão – revendas de material de construção", "Boleto compensado", 38900),
            new Entrada(6, "Venda direta – Condomínio Parque das Árvores", "PIX", 32350)
    );

    public void popular() {
        Integer feito = jdbc.queryForObject("SELECT COUNT(*) FROM migracoes WHERE nome = ?", Integer.class, MARCA);
        if (feito != null && feito > 0) {
            log.info("Financeiro de demonstracao ja inserido neste banco; nada a fazer.");
            return;
        }

        LocalDate hoje = LocalDate.now(FUSO);
        YearMonth atual = YearMonth.from(hoje);
        List<LancamentoFinanceiro> novos = new ArrayList<>();

        for (int i = 0; i < FATOR.length; i++) {
            YearMonth mes = atual.minusMonths(FATOR.length - 1 - i);
            double fator = FATOR[i];
            boolean mesAtual = mes.equals(atual);

            for (Compra c : COMPRAS) {
                novos.add(lancamento(TipoLancamento.COMPRA, dia(mes, c.dia(), hoje), null, c.material(), c.fornecedor(),
                        c.quantidade(), arredondar(c.valor() * fator, 100), mesAtual ? c.status() : PAGO));
            }
            for (Despesa d : DESPESAS) {
                String descricao = d.descricao();
                if (d.categoria() == IMPOSTOS && descricao.startsWith("IPTU")) {
                    // IPTU em 10 parcelas, de fevereiro a novembro
                    int m = mes.getMonthValue();
                    if (m < 2 || m > 11) continue;
                    descricao += " (parcela " + (m - 1) + "/10)";
                }
                long valor = d.varia() ? arredondar(d.valor() * fator, 10) : d.valor();
                novos.add(lancamento(TipoLancamento.DESPESA, dia(mes, d.dia(), hoje), d.categoria(), descricao,
                        d.favorecido(), null, valor, mesAtual ? d.status() : PAGO));
            }
            for (Entrada e : ENTRADAS) {
                novos.add(lancamento(TipoLancamento.ENTRADA, dia(mes, e.dia(), hoje), null, e.descricao(), e.origem(),
                        null, arredondar(e.valor() * fator, 10), PAGO));
            }
        }
        lancamentos.saveAll(novos);

        int pagos = pagarPedidosAntigos(hoje);

        jdbc.update("INSERT INTO migracoes (nome) VALUES (?)", MARCA);
        log.info("Financeiro de demonstracao inserido: {} lancamentos e {} pedidos pagos.", novos.size(), pagos);
    }

    /** Os pedidos entregues e aprovados ha mais tempo ja foram pagos (alguns no PIX, outros no boleto). */
    private int pagarPedidosAntigos(LocalDate hoje) {
        Instant limite = Instant.now().minus(PAGOS_ATE);
        int n = 0;
        for (PedidoCliente p : pedidos.findAll()) {
            if (p.getStatus() == StatusPedidoCliente.ENTREGUE && p.getPagoEm() == null
                    && p.getAprovadoEm() != null && p.getAprovadoEm().isBefore(limite)) {
                LocalDate pago = LocalDate.ofInstant(p.getAprovadoEm(), FUSO).plusDays(12);
                p.setPagoEm(pago.isAfter(hoje) ? hoje : pago);
                p.setFormaPagamento(n % 2 == 0 ? FormaPagamento.PIX : FormaPagamento.BOLETO);
                pedidos.save(p);
                n++;
            }
        }
        return n;
    }

    /** Dia do mes; no mes atual, espalha os lancamentos entre o dia 1 e hoje (nada no futuro). */
    private static LocalDate dia(YearMonth mes, int dia, LocalDate hoje) {
        int ultimo = mes.lengthOfMonth();
        int d = mes.equals(YearMonth.from(hoje)) ? Math.round((float) dia * hoje.getDayOfMonth() / ultimo) : dia;
        return mes.atDay(Math.max(1, Math.min(d, ultimo)));
    }

    private static long arredondar(double v, int passo) {
        return Math.round(v / passo) * passo;
    }

    private static LancamentoFinanceiro lancamento(TipoLancamento tipo, LocalDate data, CategoriaDespesa categoria,
                                                   String descricao, String favorecido, String quantidade,
                                                   long valor, StatusLancamento status) {
        LancamentoFinanceiro l = new LancamentoFinanceiro();
        l.setTipo(tipo);
        l.setData(data);
        l.setCategoria(categoria);
        l.setDescricao(descricao);
        l.setFavorecido(favorecido);
        l.setQuantidade(quantidade);
        l.setValor(BigDecimal.valueOf(valor));
        l.setStatus(status);
        return l;
    }
}
