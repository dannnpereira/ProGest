# Diagrama de Casos de Uso: ProGest

Casos de uso do sistema como ele funciona hoje: o **site da Amaral Alambrados** (cliente) e o **painel ProGest** (ERP), ligados à mesma API.

Os casos marcados como **(proposto)** ainda não existem e têm issue aberta no GitHub.

## Atores

| Ator | Quem é | Onde atua |
|---|---|---|
| **Visitante** | Qualquer pessoa no site, sem login | Site |
| **Cliente** | Visitante com conta (cadastro por CPF). Herda tudo do Visitante | Site |
| **Funcionário** | Equipe da fábrica com perfil `FUNCIONARIO`. Só acessa Produção e Entregas | ERP |
| **Administrador** | Equipe com perfil `ADMIN`. Herda tudo do Funcionário e acessa todas as telas | ERP |
| **ViaCEP** (sistema externo) | API pública que devolve o endereço a partir do CEP | Site e ERP |
| **WhatsApp** (sistema externo) | Conversa com o cliente aberta pelo ERP | ERP |

## Diagrama

> O GitHub desenha o diagrama abaixo (Mermaid). Imagens prontas (PNG/SVG), separadas em site e ERP, ficam em [`docs/diagramas/`](diagramas/). Para a notação UML completa, use a versão em PlantUML no fim da página.

```mermaid
flowchart LR
    Visitante(["👤 Visitante"])
    Cliente(["👤 Cliente"])
    Funcionario(["👤 Funcionário"])
    Admin(["👤 Administrador"])
    ViaCEP[["ViaCEP"]]
    WhatsApp[["WhatsApp"]]

    Cliente -. herda .-> Visitante
    Admin -. herda .-> Funcionario

    subgraph SITE["Site da Amaral Alambrados"]
        UC01([UC01 Simular orçamento no configurador])
        UC02([UC02 Calcular frete pelo CEP])
        UC03([UC03 Baixar ficha técnica e orçamento em PDF])
        UC04([UC04 Cadastrar conta])
        UC05([UC05 Entrar e sair])
        UC06([UC06 Fazer pedido])
        UC07([UC07 Acompanhar pedidos])
        UC08([UC08 Consultar perfil])
        UC09([UC09 Recuperar senha])
    end

    subgraph ERP["Painel ProGest (ERP)"]
        UC10([UC10 Entrar no painel])
        UC11([UC11 Avançar ou voltar etapa da produção])
        UC12([UC12 Aprovar pedido - individual ou em lote])
        UC13([UC13 Recusar pedido com motivo])
        UC14([UC14 Ver prévia técnica e memorial])
        UC15([UC15 Conversar com o cliente])
        UC16([UC16 Criar orçamento no ERP])
        UC17([UC17 Buscar cliente por CPF])
        UC18([UC18 Cadastrar conta do cliente])
        UC19([UC19 Gerenciar produtos])
        UC20([UC20 Gerenciar tabela de preços])
        UC21([UC21 Definir regras do orçamento])
        UC22([UC22 Registrar ou estornar pagamento])
        UC23([UC23 Registrar compras e saídas])
        UC24([UC24 Consultar caixa e comparativo mensal])
        UC25([UC25 Configurar dados da empresa])
        UC26([UC26 Controlar estoque de arames - proposto])
        UC27([UC27 Gerenciar usuários do painel - proposto])
        UC28([UC28 Consultar clientes - proposto])
        UC29([UC29 Gerar link de nova senha do cliente])
    end

    Visitante --> UC01 & UC03 & UC04 & UC05
    Cliente --> UC06 & UC07 & UC08 & UC09
    Funcionario --> UC10 & UC11
    Admin --> UC12 & UC13 & UC14 & UC16 & UC19 & UC20 & UC21
    Admin --> UC22 & UC23 & UC24 & UC25 & UC26 & UC27 & UC28 & UC29

    UC01 -. include .-> UC02
    UC06 -. include .-> UC01
    UC02 --- ViaCEP
    UC16 -. include .-> UC02
    UC17 -. extend .-> UC16
    UC18 -. extend .-> UC17
    UC14 -. extend .-> UC12
    UC15 -. extend .-> UC12
    UC15 --- WhatsApp

    classDef proposto stroke-dasharray: 5 5,fill:#fff8e6,stroke:#d97706
    class UC26,UC27,UC28 proposto
```

## Descrição resumida dos casos de uso

| Código | Caso de uso | Ator | Regras principais |
|---|---|---|---|
| UC01 | Simular orçamento | Visitante | Escolhe arame, malha (só as que têm preço com o arame), tratamento e medidas (altura de 1 a 6 m, comprimento de 10 a 10.000 m). O valor é calculado pela API (`POST /api/orcamento`) com a tabela de preços do ERP. |
| UC02 | Calcular frete pelo CEP | Visitante | Endereço pelo ViaCEP; frete = combustível por km + pedágio acima de 25 km + taxa base. Retirada na fábrica não tem frete. |
| UC03 | Baixar ficha técnica e orçamento em PDF | Visitante | Gera o PDF com a especificação e os valores da simulação. |
| UC04 | Cadastrar conta | Visitante | Nome, CPF válido e único, telefone, e-mail único e senha de 8 a 72 caracteres. |
| UC05 | Entrar e sair | Visitante / Cliente | Login por e-mail e senha; a sessão fica num token. |
| UC06 | Fazer pedido | Cliente | Só com login. Grava o pedido como **Aguardando aprovação**, com os valores recalculados no backend e o nome dos produtos no momento do pedido. |
| UC07 | Acompanhar pedidos | Cliente | Linha do tempo: Aprovação → Pagamento → Produção → Aguardando entrega/retirada → Finalizado. Pedido recusado mostra o motivo. |
| UC08 | Consultar perfil | Cliente | Mostra os dados do cadastro com o CPF parcialmente oculto. |
| UC09 | Recuperar senha | Cliente | "Esqueceu a senha?": link de uso único por e-mail, válido por 30 minutos. A resposta é igual com ou sem conta, no máximo 3 e-mails a cada 15 minutos, e trocar a senha encerra as sessões abertas. |
| UC10 | Entrar no painel | Funcionário | Usuários separados dos clientes (`usuarios_erp`). Admin abre em Aprovação; funcionário em Produção. |
| UC11 | Avançar ou voltar etapa | Funcionário | A fazer → Em produção → Entregue. Não pula etapas (validação no backend). |
| UC12 | Aprovar pedido | Administrador | Individual ou em lote. O pedido vai para **A fazer** e abre uma conta a receber de 15 dias. |
| UC13 | Recusar pedido | Administrador | Motivo opcional, exibido para o cliente. |
| UC14 | Ver prévia técnica | Administrador | Desenho automático da tela, consumo de aço, tempo de tear, veículo sugerido e memorial descritivo para baixar. |
| UC15 | Conversar com o cliente | Administrador | Abre o WhatsApp com uma mensagem sobre o pedido. |
| UC16 | Criar orçamento no ERP | Administrador | Mesmo cálculo do site; cliente por CPF, novo ou sem cadastro; salva em PDF. |
| UC17 / UC18 | Buscar cliente / cadastrar conta | Administrador | CPF enviado no corpo da requisição; a conta criada já entra no site. |
| UC19 | Gerenciar produtos | Administrador | Arame, malha, tratamento e acessórios. Ativo = aparece no site. Exclusão lógica (`excluido`). |
| UC20 | Gerenciar tabela de preços | Administrador | Preço por combinação arame + malha + tratamento, por m² (vira opção no site) ou por kg (arame avulso). |
| UC21 | Definir regras do orçamento | Administrador | Desconto à vista (0 a 50%) e parcelas máximas (1 a 24). |
| UC22 | Registrar ou estornar pagamento | Administrador | Data e forma (PIX, boleto, TED, cartão, dinheiro). O valor entra nas entradas do mês e o cliente vê o pagamento confirmado. |
| UC23 | Registrar compras e saídas | Administrador | Compras de material (fornecedor) e saídas por categoria, com status Pago, A pagar ou Atrasado. |
| UC24 | Consultar caixa e comparativo | Administrador | Vendas, entradas, saídas e saldo do mês; comparativo dos últimos 6 meses. |
| UC25 | Configurar dados da empresa | Administrador | Razão social, CNPJ, WhatsApp e origem do frete (hoje ficam só no navegador). |
| UC29 | Gerar link de nova senha do cliente | Administrador | No Novo orçamento, depois de buscar o cliente: link válido por 24 horas para copiar ou enviar pelo WhatsApp. Funciona sem e-mail configurado. |
| UC26–UC28 | Propostos | — | Ver as issues abertas no GitHub. |

## Versão PlantUML (notação UML para a documentação)

Cole em [plantuml.com/plantuml](https://www.plantuml.com/plantuml) ou use a extensão PlantUML do VS Code para exportar em PNG/SVG.

```plantuml
@startuml casos-de-uso-progest
left to right direction
skinparam packageStyle rectangle
skinparam usecase {
  BackgroundColor<<proposto>> #FFF8E6
  BorderColor<<proposto>> #D97706
}

actor Visitante
actor Cliente
actor "Funcionário" as Funcionario
actor Administrador
actor "ViaCEP" as ViaCEP <<sistema>>
actor "WhatsApp" as WhatsApp <<sistema>>

Cliente -|> Visitante
Administrador -|> Funcionario

rectangle "Site da Amaral Alambrados" {
  usecase "UC01 Simular orçamento" as UC01
  usecase "UC02 Calcular frete pelo CEP" as UC02
  usecase "UC03 Baixar ficha técnica em PDF" as UC03
  usecase "UC04 Cadastrar conta" as UC04
  usecase "UC05 Entrar e sair" as UC05
  usecase "UC06 Fazer pedido" as UC06
  usecase "UC07 Acompanhar pedidos" as UC07
  usecase "UC08 Consultar perfil" as UC08
  usecase "UC09 Recuperar senha" as UC09
}

rectangle "Painel ProGest (ERP)" {
  usecase "UC10 Entrar no painel" as UC10
  usecase "UC11 Avançar ou voltar etapa da produção" as UC11
  usecase "UC12 Aprovar pedido" as UC12
  usecase "UC13 Recusar pedido" as UC13
  usecase "UC14 Ver prévia técnica e memorial" as UC14
  usecase "UC15 Conversar com o cliente" as UC15
  usecase "UC16 Criar orçamento no ERP" as UC16
  usecase "UC17 Buscar cliente por CPF" as UC17
  usecase "UC18 Cadastrar conta do cliente" as UC18
  usecase "UC19 Gerenciar produtos" as UC19
  usecase "UC20 Gerenciar tabela de preços" as UC20
  usecase "UC21 Definir regras do orçamento" as UC21
  usecase "UC22 Registrar ou estornar pagamento" as UC22
  usecase "UC23 Registrar compras e saídas" as UC23
  usecase "UC24 Consultar caixa e comparativo" as UC24
  usecase "UC25 Configurar dados da empresa" as UC25
  usecase "UC26 Controlar estoque de arames" as UC26 <<proposto>>
  usecase "UC27 Gerenciar usuários do painel" as UC27 <<proposto>>
  usecase "UC28 Consultar clientes" as UC28 <<proposto>>
  usecase "UC29 Gerar link de nova senha" as UC29
}

Visitante --> UC01
Visitante --> UC03
Visitante --> UC04
Visitante --> UC05
Cliente --> UC06
Cliente --> UC07
Cliente --> UC08
Cliente --> UC09

Funcionario --> UC10
Funcionario --> UC11
Administrador --> UC12
Administrador --> UC13
Administrador --> UC16
Administrador --> UC19
Administrador --> UC20
Administrador --> UC21
Administrador --> UC22
Administrador --> UC23
Administrador --> UC24
Administrador --> UC25
Administrador --> UC26
Administrador --> UC27
Administrador --> UC28
Administrador --> UC29

UC01 ..> UC02 : <<include>>
UC06 ..> UC01 : <<include>>
UC16 ..> UC02 : <<include>>
UC17 ..> UC16 : <<extend>>
UC18 ..> UC17 : <<extend>>
UC14 ..> UC12 : <<extend>>
UC15 ..> UC12 : <<extend>>

UC02 --> ViaCEP
UC15 --> WhatsApp
@enduml
```
