package com.progest.Backend_api.config;

import com.progest.Backend_api.dto.OrcamentoRequest;
import com.progest.Backend_api.dto.OrcamentoResponse;
import com.progest.Backend_api.model.Cliente;
import com.progest.Backend_api.model.PedidoCliente;
import com.progest.Backend_api.model.Produto;
import com.progest.Backend_api.model.StatusPedidoCliente;
import com.progest.Backend_api.repository.ClienteRepository;
import com.progest.Backend_api.repository.PedidoClienteRepository;
import com.progest.Backend_api.repository.ProdutoRepository;
import com.progest.Backend_api.services.OrcamentoService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import static com.progest.Backend_api.model.StatusPedidoCliente.*;

/**
 * Dados ficticios para APRESENTACAO do projeto: clientes e pedidos do site em todas
 * as etapas (aguardando aprovacao, recusado, a fazer, em producao, entregue), para as
 * telas de Aprovacao e Producao do ERP e o "Acompanhar pedido" do site nao ficarem vazios.
 *
 * - Desligado por padrao. Liga com DEMO_DADOS=true (ou progest.demo.ativo=true no local.properties).
 * - Roda uma vez so por banco (marca "dados_demo" na tabela migracoes); reiniciar nao duplica.
 * - Os valores vem do OrcamentoService, ou seja, da tabela de precos atual do ERP.
 * - As datas sao relativas ao dia em que o seed roda, para a tela parecer "viva".
 * - Com DEMO_SENHA (minimo 8 caracteres), os clientes de exemplo conseguem entrar no site
 *   com essa senha. Sem ela, aparecem so no ERP. A senha nunca fica no codigo (repo publico).
 *
 * CPFs e e-mails sao ficticios (dominio exemplo.com.br).
 */
@Component
public class DadosDemo implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DadosDemo.class);
    static final String MARCA = "dados_demo";
    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    private final boolean ativo;
    private final String senha;
    private final JdbcTemplate jdbc;
    private final ClienteRepository clientes;
    private final PedidoClienteRepository pedidos;
    private final ProdutoRepository produtos;
    private final OrcamentoService orcamentos;

    public DadosDemo(@Value("${progest.demo.ativo:false}") boolean ativo,
                     @Value("${progest.demo.senha:}") String senha,
                     JdbcTemplate jdbc, ClienteRepository clientes, PedidoClienteRepository pedidos,
                     ProdutoRepository produtos, OrcamentoService orcamentos) {
        this.ativo = ativo;
        this.senha = senha;
        this.jdbc = jdbc;
        this.clientes = clientes;
        this.pedidos = pedidos;
        this.produtos = produtos;
        this.orcamentos = orcamentos;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (ativo) {
            popular();
        }
    }

    // ---------- Dados ----------

    private record ClienteDemo(String cpf, String nome, String email, String telefone) {}

    private static final List<ClienteDemo> CLIENTES = List.of(
            new ClienteDemo("12345678062", "Roberto Almeida", "roberto.almeida@exemplo.com.br", "(15) 99221-4580"),
            new ClienteDemo("23456789173", "Carlos Eduardo Mendes", "carlos.mendes@exemplo.com.br", "(15) 99812-3344"),
            new ClienteDemo("34567891228", "Sebastião Ribeiro", "sebastiao.ribeiro@exemplo.com.br", "(15) 99701-2290"),
            new ClienteDemo("45678912364", "Ana Paula Rodrigues", "anapaula.r@exemplo.com.br", "(11) 98456-7720"),
            new ClienteDemo("56789123482", "Fernanda Costa", "fernanda.costa@exemplo.com.br", "(15) 99243-1100"),
            new ClienteDemo("67891234582", "Marcos Vinícius Oliveira", "marcos.oliveira@exemplo.com.br", "(15) 99633-8811"),
            new ClienteDemo("78912345664", "Patrícia Nogueira", "patricia.nogueira@exemplo.com.br", "(15) 99271-0099"),
            new ClienteDemo("89123456728", "Juliana Ferreira Santos", "ju.ferreira@exemplo.com.br", "(15) 99124-5567")
    );

    /** Endereco da obra; null = retirada na fabrica. */
    private record Obra(String cep, String endereco, String cidade, String uf) {}

    /**
     * Um pedido de exemplo. "criadoHa" = quanto tempo antes de agora o cliente fez o pedido;
     * "previsaoDias" = previsao de entrega em dias a partir de hoje (negativo = atrasado).
     */
    private record PedidoDemo(int cliente, String arame, String malha, String tratamento,
                              String altura, String comprimento, Obra obra,
                              StatusPedidoCliente status, Duration criadoHa, Integer previsaoDias,
                              String motivoRecusa) {}

    private static Obra obra(String cep, String endereco, String cidade) {
        return new Obra(cep, endereco + " - " + cidade + "/SP", cidade, "SP");
    }

    private static Duration h(long horas) { return Duration.ofHours(horas); }
    private static Duration d(long dias) { return Duration.ofDays(dias); }

    private static final List<PedidoDemo> PEDIDOS = List.of(
            // Entregues (historico)
            new PedidoDemo(0, "FIO_12", "MALHA_2", "GALVANIZADA", "2.00", "180", obra("18045-000", "Av. Itavuvu, nº 3200 - Jardim Itanguá", "Sorocaba"), ENTREGUE, d(34), -22, null),
            new PedidoDemo(4, "FIO_12", "MALHA_2", "PVC", "4.00", "120", obra("18110-000", "Rua Moraes Barros, nº 455 - Centro", "Votorantim"), ENTREGUE, d(26), -15, null),
            new PedidoDemo(2, "FIO_14", "MALHA_3", "GALVANIZADA", "1.80", "450", obra("18200-000", "Estrada Municipal do Turvo, km 7 - Zona Rural", "Itapetininga"), ENTREGUE, d(19), -9, null),
            new PedidoDemo(5, "FIO_14", "MALHA_2_5", "GALVANIZADA", "1.50", "40", null, ENTREGUE, d(12), -4, null),

            // Em producao (um deles atrasado, para mostrar o alerta)
            new PedidoDemo(6, "FIO_12", "MALHA_2", "PVC", "2.50", "160", obra("18040-000", "Rua Pedro José Senger, nº 810 - Vila Hortência", "Sorocaba"), EM_PROCESSO, d(9), -1, null),
            new PedidoDemo(0, "FIO_12", "MALHA_3", "GALVANIZADA", "2.00", "260", obra("13300-000", "Av. Galileu Bicudo, nº 1500 (Lote 12) - Jardim Paraíso", "Itu"), EM_PROCESSO, d(6), 2, null),
            new PedidoDemo(1, "FIO_14", "MALHA_2", "PVC_PRETO", "1.80", "55", null, EM_PROCESSO, d(5), 3, null),

            // A fazer (aprovados, aguardando inicio)
            new PedidoDemo(3, "FIO_14", "MALHA_2_5", "PVC", "1.50", "38", obra("18047-000", "Rua Antônio Perez Hernandez, nº 92 - Jardim Ana Maria", "Sorocaba"), A_FAZER, d(3), 5, null),
            new PedidoDemo(2, "FIO_12", "MALHA_3_18", "GALVANIZADA", "1.50", "600", obra("18200-000", "Estrada Municipal do Turvo, km 7 - Zona Rural", "Itapetininga"), A_FAZER, d(2), 6, null),
            new PedidoDemo(7, "FIO_14", "MALHA_3", "PVC", "2.00", "30", null, A_FAZER, h(30), 7, null),

            // Recusado
            new PedidoDemo(5, "FIO_16", "MALHA_3_4", "GALVANIZADA", "3.00", "900", null, RECUSADO, d(4), null,
                    "Quantidade de Fio 16 com malha 3/4\" acima do estoque disponível. Entraremos em contato com uma alternativa."),

            // Aguardando aprovacao (fila do ERP)
            new PedidoDemo(4, "FIO_12", "MALHA_2", "GALVANIZADA", "3.00", "140", obra("18110-000", "Rua Moraes Barros, nº 455 (Quadra 2) - Centro", "Votorantim"), AGUARDANDO_APROVACAO, h(20), null, null),
            new PedidoDemo(1, "FIO_12", "MALHA_2_5", "PVC", "1.80", "72", obra("18035-000", "Rua Aparecida, nº 1210 - Jardim Santa Rosália", "Sorocaba"), AGUARDANDO_APROVACAO, h(7), null, null),
            new PedidoDemo(6, "FIO_14", "MALHA_2", "GALVANIZADA", "2.00", "95", obra("18120-000", "Av. dos Estudantes, nº 300 - Centro", "Mairinque"), AGUARDANDO_APROVACAO, h(3), null, null),
            new PedidoDemo(7, "FIO_14", "MALHA_3", "PVC_PRETO", "1.50", "24", null, AGUARDANDO_APROVACAO, Duration.ofMinutes(40), null, null)
    );

    // ---------- Execucao ----------

    public void popular() {
        Integer feito = jdbc.queryForObject("SELECT COUNT(*) FROM migracoes WHERE nome = ?", Integer.class, MARCA);
        if (feito != null && feito > 0) {
            log.info("Dados de demonstracao ja inseridos neste banco; nada a fazer.");
            return;
        }

        boolean comSenha = senha != null && senha.length() >= 8;
        String hash = comSenha ? new BCryptPasswordEncoder().encode(senha) : null;

        List<Cliente> salvos = new ArrayList<>();
        for (ClienteDemo c : CLIENTES) {
            Cliente cli = clientes.findByCpf(c.cpf()).orElseGet(() -> new Cliente(c.cpf(), c.telefone(), c.nome(), c.email()));
            if (hash != null && cli.getSenhaHash() == null) {
                cli.setSenhaHash(hash);
            }
            salvos.add(clientes.save(cli));
        }

        Instant agora = Instant.now();
        LocalDate hoje = LocalDate.now(FUSO);
        int criados = 0;
        for (PedidoDemo d : PEDIDOS) {
            try {
                pedidos.save(montar(d, salvos.get(d.cliente()), agora, hoje));
                criados++;
            } catch (RuntimeException e) {
                // Combinacao removida da tabela de precos pelo ERP: pula so este pedido
                log.warn("Pedido de demonstracao ignorado ({} {} {}): {}", d.arame(), d.malha(), d.tratamento(), e.getMessage());
            }
        }

        jdbc.update("INSERT INTO migracoes (nome) VALUES (?)", MARCA);
        log.info("Dados de demonstracao inseridos: {} clientes e {} pedidos{}.", salvos.size(), criados,
                comSenha ? " (clientes podem entrar no site com DEMO_SENHA)" : "");
    }

    private PedidoCliente montar(PedidoDemo d, Cliente cliente, Instant agora, LocalDate hoje) {
        Obra obra = d.obra();
        OrcamentoResponse o = orcamentos.calcular(new OrcamentoRequest(d.arame(), d.malha(), d.tratamento(),
                new BigDecimal(d.altura()), new BigDecimal(d.comprimento()), obra != null, obra == null ? null : obra.cep()));

        PedidoCliente p = new PedidoCliente();
        p.setCliente(cliente);
        p.setStatus(d.status());
        p.setArame(d.arame());
        p.setMalha(d.malha());
        p.setTratamento(d.tratamento());
        p.setArameNome(nome(d.arame()));
        p.setMalhaNome(nome(d.malha()));
        p.setTratamentoNome(nome(d.tratamento()));
        p.setAlturaM(new BigDecimal(d.altura()));
        p.setComprimentoM(new BigDecimal(d.comprimento()));
        p.setEntrega(obra != null);
        if (obra != null) {
            p.setCep(obra.cep());
            p.setEndereco(obra.endereco());
            p.setCidade(obra.cidade());
            p.setUf(obra.uf());
            p.setDistanciaKm(o.frete().distanciaKm());
        }
        p.setValorMateriaPrima(o.materiaPrima());
        p.setValorAcessorios(o.acessorios());
        p.setValorFrete(o.frete().valor());
        p.setValorDesconto(o.desconto());
        p.setValorTotal(o.total());
        p.setParcelas(o.parcelas());
        p.setValorParcela(o.valorParcela());

        // Linha do tempo coerente com a etapa: pedido -> aprovacao -> producao -> entrega
        Instant criado = agora.minus(d.criadoHa());
        p.setCriadoEm(criado);
        switch (d.status()) {
            case RECUSADO -> {
                p.setRecusadoEm(criado.plus(h(5)));
                p.setMotivoRecusa(d.motivoRecusa());
            }
            case A_FAZER, EM_PROCESSO, ENTREGUE -> {
                p.setPrevisaoEntrega(hoje.plusDays(d.previsaoDias()));
                // Ultimo marco da linha do tempo: a entrega (entregue) ou agora (ainda na fabrica)
                Instant fim = agora;
                if (d.status() == ENTREGUE) {
                    fim = hoje.plusDays(d.previsaoDias()).atTime(15, 30).atZone(FUSO).toInstant();
                    p.setEntregueEm(fim);
                }
                Duration janela = Duration.between(criado, fim);
                Instant producao = criado.plus(janela.multipliedBy(45).dividedBy(100));
                if (d.status() != A_FAZER) {
                    p.setProducaoIniciadaEm(horarioComercial(producao, fim));
                }
                p.setAprovadoEm(horarioComercial(criado.plus(janela.multipliedBy(15).dividedBy(100)),
                        d.status() == A_FAZER ? fim : producao));
            }
            default -> { }
        }

        p = pedidos.save(p);
        p.setCodigo("AM-" + (1000 + p.getId()));
        return p;
    }

    /**
     * Empurra um horario de madrugada/noite para as 8h seguintes (a fabrica nao aprova
     * nem produz de madrugada). So adianta para frente e nunca passa do limite, entao a
     * ordem das etapas se mantem; se nao couber, fica o horario original.
     */
    private static Instant horarioComercial(Instant t, Instant limite) {
        var local = t.atZone(FUSO);
        if (local.getHour() >= 8 && local.getHour() < 18) {
            return t;
        }
        var dia = local.getHour() < 8 ? local.toLocalDate() : local.toLocalDate().plusDays(1);
        Instant ajustado = dia.atTime(8, local.getMinute()).atZone(FUSO).toInstant();
        return ajustado.isAfter(limite) ? t : ajustado;
    }

    private String nome(String chave) {
        return produtos.findByChave(chave).map(Produto::getNome).orElse(chave);
    }
}
