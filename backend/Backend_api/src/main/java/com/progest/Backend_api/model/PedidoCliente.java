package com.progest.Backend_api.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Pedido feito pelo cliente no configurador do site. Aparece para o cliente em
 * "Acompanhar pedido" e para a Amaral na Aprovação e na Produção do ERP.
 * Os valores são calculados no backend (OrcamentoService) no momento do pedido.
 */
@Entity
@Table(name = "pedidos_cliente")
public class PedidoCliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 20, unique = true)
    private String codigo;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private StatusPedidoCliente status;

    // Configuração da tela (chaves dos produtos)
    @Column(nullable = false, length = 30) private String arame;
    @Column(nullable = false, length = 30) private String malha;
    @Column(nullable = false, length = 30) private String tratamento;
    @Column(name = "altura_m", nullable = false, precision = 6, scale = 2) private BigDecimal alturaM;
    @Column(name = "comprimento_m", nullable = false, precision = 8, scale = 2) private BigDecimal comprimentoM;

    // Entrega
    @Column(nullable = false) private boolean entrega;
    @Column(length = 9) private String cep;
    @Column(length = 255) private String endereco;
    @Column(length = 100) private String cidade;
    @Column(length = 2) private String uf;
    @Column(name = "distancia_km") private Integer distanciaKm;

    // Valores (R$)
    @Column(name = "valor_materia_prima", nullable = false, precision = 12, scale = 2) private BigDecimal valorMateriaPrima;
    @Column(name = "valor_acessorios", nullable = false, precision = 12, scale = 2) private BigDecimal valorAcessorios;
    @Column(name = "valor_frete", nullable = false, precision = 12, scale = 2) private BigDecimal valorFrete;
    @Column(name = "valor_desconto", nullable = false, precision = 12, scale = 2) private BigDecimal valorDesconto;
    @Column(name = "valor_total", nullable = false, precision = 12, scale = 2) private BigDecimal valorTotal;
    @Column(nullable = false) private int parcelas;
    @Column(name = "valor_parcela", nullable = false, precision = 12, scale = 2) private BigDecimal valorParcela;

    // Andamento
    @Column(name = "aprovado_em") private Instant aprovadoEm;
    @Column(name = "recusado_em") private Instant recusadoEm;
    @Column(name = "motivo_recusa", length = 500) private String motivoRecusa;
    @Column(name = "producao_iniciada_em") private Instant producaoIniciadaEm;
    @Column(name = "entregue_em") private Instant entregueEm;
    @Column(name = "previsao_entrega") private LocalDate previsaoEntrega;

    public Long getId() { return id; }
    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }
    public Cliente getCliente() { return cliente; }
    public void setCliente(Cliente cliente) { this.cliente = cliente; }
    public Instant getCriadoEm() { return criadoEm; }
    public void setCriadoEm(Instant criadoEm) { this.criadoEm = criadoEm; }
    public StatusPedidoCliente getStatus() { return status; }
    public void setStatus(StatusPedidoCliente status) { this.status = status; }
    public String getArame() { return arame; }
    public void setArame(String arame) { this.arame = arame; }
    public String getMalha() { return malha; }
    public void setMalha(String malha) { this.malha = malha; }
    public String getTratamento() { return tratamento; }
    public void setTratamento(String tratamento) { this.tratamento = tratamento; }
    public BigDecimal getAlturaM() { return alturaM; }
    public void setAlturaM(BigDecimal alturaM) { this.alturaM = alturaM; }
    public BigDecimal getComprimentoM() { return comprimentoM; }
    public void setComprimentoM(BigDecimal comprimentoM) { this.comprimentoM = comprimentoM; }
    public boolean isEntrega() { return entrega; }
    public void setEntrega(boolean entrega) { this.entrega = entrega; }
    public String getCep() { return cep; }
    public void setCep(String cep) { this.cep = cep; }
    public String getEndereco() { return endereco; }
    public void setEndereco(String endereco) { this.endereco = endereco; }
    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }
    public String getUf() { return uf; }
    public void setUf(String uf) { this.uf = uf; }
    public Integer getDistanciaKm() { return distanciaKm; }
    public void setDistanciaKm(Integer distanciaKm) { this.distanciaKm = distanciaKm; }
    public BigDecimal getValorMateriaPrima() { return valorMateriaPrima; }
    public void setValorMateriaPrima(BigDecimal v) { this.valorMateriaPrima = v; }
    public BigDecimal getValorAcessorios() { return valorAcessorios; }
    public void setValorAcessorios(BigDecimal v) { this.valorAcessorios = v; }
    public BigDecimal getValorFrete() { return valorFrete; }
    public void setValorFrete(BigDecimal v) { this.valorFrete = v; }
    public BigDecimal getValorDesconto() { return valorDesconto; }
    public void setValorDesconto(BigDecimal v) { this.valorDesconto = v; }
    public BigDecimal getValorTotal() { return valorTotal; }
    public void setValorTotal(BigDecimal v) { this.valorTotal = v; }
    public int getParcelas() { return parcelas; }
    public void setParcelas(int parcelas) { this.parcelas = parcelas; }
    public BigDecimal getValorParcela() { return valorParcela; }
    public void setValorParcela(BigDecimal v) { this.valorParcela = v; }
    public Instant getAprovadoEm() { return aprovadoEm; }
    public void setAprovadoEm(Instant v) { this.aprovadoEm = v; }
    public Instant getRecusadoEm() { return recusadoEm; }
    public void setRecusadoEm(Instant v) { this.recusadoEm = v; }
    public String getMotivoRecusa() { return motivoRecusa; }
    public void setMotivoRecusa(String v) { this.motivoRecusa = v; }
    public Instant getProducaoIniciadaEm() { return producaoIniciadaEm; }
    public void setProducaoIniciadaEm(Instant v) { this.producaoIniciadaEm = v; }
    public Instant getEntregueEm() { return entregueEm; }
    public void setEntregueEm(Instant v) { this.entregueEm = v; }
    public LocalDate getPrevisaoEntrega() { return previsaoEntrega; }
    public void setPrevisaoEntrega(LocalDate v) { this.previsaoEntrega = v; }
}
