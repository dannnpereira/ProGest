# Diagrama do Banco de Dados (DER): ProGest

Modelo do banco usado pela API (`backend/Backend_api`). O mesmo `schema.sql` cria as tabelas no **H2** (local) e no **PostgreSQL/Supabase** (produção) a cada início do backend, sem apagar dados.

Fonte: [`backend/Backend_api/src/main/resources/schema.sql`](../backend/Backend_api/src/main/resources/schema.sql).

Imagens prontas (PNG/SVG) em [`docs/diagramas/`](diagramas/).

## Visão geral

| Módulo | Tabelas em uso | Para que serve |
|---|---|---|
| Clientes e acesso | `clientes`, `usuarios_erp` | Contas do site (por CPF) e usuários do painel (ADMIN / FUNCIONARIO) |
| Catálogo e preços | `produtos`, `precos_tela`, `regras_orcamento` | Opções do configurador, preço por combinação e regras de desconto/parcelas |
| Pedidos | `pedidos_cliente` | Pedido do site: valores, entrega, workflow (aprovação → produção → entrega) e pagamento |
| Financeiro | `lancamentos_financeiros` (+ pagamento em `pedidos_cliente`) | Compras de material, saídas e vendas diretas |
| Controle | `migracoes` | Marca as cargas de dados que só podem rodar uma vez |

## Diagrama (tabelas em uso)

```mermaid
erDiagram
    CLIENTES ||--o{ PEDIDOS_CLIENTE : "faz"
    PRODUTOS ||--o{ PRECOS_TELA : "arame / malha / tratamento (por chave)"
    PRODUTOS ||--o{ PEDIDOS_CLIENTE : "arame / malha / tratamento (por chave)"

    CLIENTES {
        BIGINT id PK
        VARCHAR cpf UK "11 dígitos"
        VARCHAR nome
        VARCHAR telefone
        VARCHAR email UK
        VARCHAR senha_hash "BCrypt; nulo = cliente sem conta no site"
    }

    USUARIOS_ERP {
        BIGINT id PK
        VARCHAR nome
        VARCHAR email UK
        VARCHAR senha_hash
        BOOLEAN ativo
        VARCHAR perfil "ADMIN | FUNCIONARIO"
    }

    PRODUTOS {
        BIGINT id PK
        VARCHAR chave UK "FIO_12, MALHA_2, PVC..."
        VARCHAR categoria "ARAME | MALHA | TRATAMENTO | ACESSORIOS"
        VARCHAR nome
        VARCHAR descricao
        VARCHAR unidade "M2 | METRO_LINEAR | UNIDADE"
        DECIMAL valor "usado só em ACESSORIOS"
        BOOLEAN ativo "aparece no site"
        BOOLEAN excluido "exclusão lógica"
    }

    PRECOS_TELA {
        BIGINT id PK
        VARCHAR arame "chave do produto"
        VARCHAR malha "chave do produto; nulo no arame avulso"
        VARCHAR tratamento "chave do produto"
        VARCHAR unidade "M2 | KG"
        DECIMAL peso_kg_m2
        DECIMAL valor_vista
        DECIMAL valor_prazo
        BOOLEAN excluido
    }

    REGRAS_ORCAMENTO {
        INT id PK "sempre 1"
        DECIMAL desconto_avista_pct
        INT parcelas_max
    }

    PEDIDOS_CLIENTE {
        BIGINT id PK
        VARCHAR codigo UK "AM-1001..."
        BIGINT cliente_id FK
        TIMESTAMPTZ criado_em
        VARCHAR status "AGUARDANDO_APROVACAO | RECUSADO | A_FAZER | EM_PROCESSO | ENTREGUE"
        VARCHAR arame
        VARCHAR malha
        VARCHAR tratamento
        VARCHAR arame_nome "nome no momento do pedido"
        VARCHAR malha_nome
        VARCHAR tratamento_nome
        DECIMAL altura_m
        DECIMAL comprimento_m
        BOOLEAN entrega "false = retirada"
        VARCHAR cep
        VARCHAR endereco
        VARCHAR cidade
        VARCHAR uf
        INT distancia_km
        DECIMAL valor_materia_prima
        DECIMAL valor_acessorios
        DECIMAL valor_frete
        DECIMAL valor_desconto
        DECIMAL valor_total
        INT parcelas
        DECIMAL valor_parcela
        TIMESTAMPTZ aprovado_em
        TIMESTAMPTZ recusado_em
        VARCHAR motivo_recusa
        TIMESTAMPTZ producao_iniciada_em
        TIMESTAMPTZ entregue_em
        DATE previsao_entrega
        DATE pago_em "nulo = conta a receber em aberto"
        VARCHAR forma_pagamento "PIX | BOLETO | TED | CARTAO | DINHEIRO"
    }

    LANCAMENTOS_FINANCEIROS {
        BIGINT id PK
        VARCHAR tipo "COMPRA | DESPESA | ENTRADA"
        DATE data_lancamento
        VARCHAR categoria "SALARIOS | ENCARGOS | ALUGUEL | ENERGIA | AGUA | IMPOSTOS | VEICULOS | FRETE | OUTROS"
        VARCHAR descricao "material, na compra"
        VARCHAR favorecido "fornecedor, na compra"
        VARCHAR quantidade
        DECIMAL valor "maior que zero"
        VARCHAR status "PAGO | A_PAGAR | ATRASADO"
    }

    MIGRACOES {
        VARCHAR nome PK "tabela_precos_2024, dados_demo..."
    }
```

> **Ligação por chave:** `precos_tela` e `pedidos_cliente` guardam a `chave` do produto (ex.: `FIO_12`), sem chave estrangeira. Assim o pedido continua válido se o produto for excluído; por isso o pedido também guarda o nome (`arame_nome`, `malha_nome`, `tratamento_nome`).

## Ciclo de vida do pedido (`pedidos_cliente.status`)

```mermaid
stateDiagram-v2
    [*] --> AGUARDANDO_APROVACAO : cliente faz o pedido no site
    AGUARDANDO_APROVACAO --> A_FAZER : administrador aprova (aprovado_em)
    AGUARDANDO_APROVACAO --> RECUSADO : administrador recusa (motivo_recusa)
    A_FAZER --> AGUARDANDO_APROVACAO : desfazer aprovação (só se não estiver pago)
    RECUSADO --> AGUARDANDO_APROVACAO : desfazer recusa
    A_FAZER --> EM_PROCESSO : iniciar produção (producao_iniciada_em)
    EM_PROCESSO --> A_FAZER : voltar etapa
    EM_PROCESSO --> ENTREGUE : marcar entregue / retirado (entregue_em)
    ENTREGUE --> EM_PROCESSO : voltar etapa
    RECUSADO --> [*]
    ENTREGUE --> [*]
```

O pagamento é independente das etapas: a partir da aprovação o pedido aparece em **Contas a receber** (prazo de 15 dias) até alguém registrar `pago_em` no Financeiro.

## Tabelas antigas (não usadas pelas telas)

Criadas no começo do projeto, antes do fluxo atual. Continuam no `schema.sql`, mas nenhuma tela usa e as rotas delas (`/api/clientes`, `/api/pedidos`, `/api/workflow`, `/api/financeiro`) exigem login de administrador. A remoção está numa issue própria.

```mermaid
erDiagram
    CLIENTES ||--o{ ENDERECOS : "possui"
    PEDIDOS ||--o| WORKFLOW_PEDIDOS : "situação atual"
    PEDIDOS ||--o{ HISTORICO_WORKFLOW : "histórico"
    PEDIDOS |o--o{ TRANSACOES_FINANCEIRAS : "vincula"

    ENDERECOS {
        BIGINT id PK
        BIGINT cliente_id FK
        VARCHAR cep
        VARCHAR numero
    }
    PEDIDOS {
        BIGINT op PK
        DECIMAL fio
        DECIMAL malha
        DATE dataentrega
        DECIMAL preco
    }
    WORKFLOW_PEDIDOS {
        BIGINT op PK,FK
        VARCHAR status "A_FAZER | EM_PROCESSO | ENTREGUE"
        TIMESTAMP data_atualizacao
    }
    HISTORICO_WORKFLOW {
        BIGINT id PK
        BIGINT op FK
        VARCHAR status
        TIMESTAMP data_alteracao
    }
    TRANSACOES_FINANCEIRAS {
        BIGINT id PK
        BIGINT op FK
        VARCHAR tipo "ENTRADA | SAIDA"
        VARCHAR tipo_despesa "IMPOSTOS | SALARIOS | INSUMOS | CONTAS_FIXAS"
        VARCHAR descricao
        VARCHAR fornecedores
        DECIMAL valor
        DATE data_movimentacao
    }
```

| Tabela antiga | Substituída por |
|---|---|
| `pedidos`, `workflow_pedidos`, `historico_workflow` | `pedidos_cliente` (status e datas de cada etapa na própria linha) |
| `enderecos` | Endereço de entrega gravado no pedido (`cep`, `endereco`, `cidade`, `uf`) |
| `transacoes_financeiras` | `lancamentos_financeiros` + pagamento em `pedidos_cliente` |
