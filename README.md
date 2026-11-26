# ProGest

Sistema de vendas e gestão da **Amaral Alambrados**, fábrica de telas para alambrado em Sorocaba/SP.

O cliente simula o orçamento e faz o pedido pelo **site**. A equipe da fábrica aprova, produz, entrega e controla o financeiro pelo **painel ProGest (ERP)**. Os dois usam a mesma **API**.

```
Site (cliente) ──┐
                 ├──► API Spring Boot ──► Banco (H2 local / PostgreSQL no Supabase)
ERP (fábrica) ───┘
```

## O que o sistema faz

**Site da Amaral** ([`progest/`](progest/))
- Configurador de alambrado: arame, malha, tratamento e medidas, com preço em tempo real
- Frete pela distância do CEP (endereço pelo ViaCEP) ou retirada na fábrica
- Ficha técnica e orçamento em PDF
- Cadastro por CPF, login, pedido e acompanhamento das etapas (aprovação, pagamento, produção e entrega)
- "Esqueceu a senha?": link de uso único por e-mail para criar uma senha nova

**Painel ProGest** ([`erp/`](erp/))
- **Aprovação:** fila dos pedidos do site, aprovação em lote, recusa com motivo e prévia técnica
- **Produção e Entregas:** quadro A fazer → Em produção → Entregue, com alerta de atraso
- **Novo orçamento:** orçamento pelo ERP com cliente por CPF e PDF; gera o link de nova senha para o cliente que esqueceu a senha
- **Produtos e Valores:** produtos do site, tabela de preços por combinação e regras de desconto/parcelas
- **Financeiro:** contas a receber, compras de material, saídas, fluxo de caixa e comparativo mensal
- Perfis **Administrador** (tudo) e **Funcionário** (só Produção e Entregas)

**API** ([`backend/Backend_api/`](backend/Backend_api/)): Java 21 e Spring Boot. Calcula orçamentos, guarda pedidos e controla o acesso de clientes e da equipe.

## Documentação

| Documento | Conteúdo |
|---|---|
| [Diagrama de casos de uso](docs/diagrama-casos-de-uso.md) | Atores, casos de uso e regras (Mermaid e PlantUML) |
| [Diagrama do banco de dados](docs/diagrama-banco-de-dados.md) | DER das tabelas atuais, ciclo de vida do pedido e tabelas antigas |
| [Prototipação no Stitch](docs/prototipacao-stitch.md) | Prompts de todas as telas (atuais e novas) |
| [Deploy na AWS (EC2)](deploy/README.md) | Docker Hub, EC2, atualização e backup |
| [Backend no Render e sites na Vercel](deploy/RENDER.md) | Publicação do backend e ligação dos sites |
| [Banco no Supabase](deploy/SUPABASE.md) | Criação e conexão do PostgreSQL |

## Rodar no computador

Pré-requisitos: **Java 21** e **Node.js 20+**.

**1. API** (porta 8081, banco H2 em arquivo):

```bash
cd backend/Backend_api
./mvnw spring-boot:run
```

Para entrar no ERP, crie `backend/Backend_api/src/main/resources/local.properties` (ele não vai para o git):

```properties
progest.admin.senha=uma-senha-com-8-ou-mais
# opcional: dados de exemplo para a apresentação
progest.demo.ativo=true
# opcional: sem SMTP, escreve no console o link do "Esqueceu a senha?" (só no seu computador)
progest.senha.logar-link=true
```

O administrador padrão é `amaralalambrados109@gmail.com` (troque com `progest.admin.email`).

**2. Site** (http://localhost:4200) e **3. ERP** (em outro terminal, http://localhost:4201):

```bash
cd progest && npm install && npm start
cd erp && npm install && npx ng serve --port 4201
```

Os dois encaminham `/api` para `http://localhost:8081` (`proxy.conf.json`).

## Testes

A Action **Testes** roda as três suítes em cada pull request e em cada merge na `main`. Para rodar no computador:

```bash
cd backend/Backend_api && ./mvnw test   # API
cd progest && npm test                  # site
cd erp && npm test                      # ERP
```

## Variáveis de ambiente (produção)

| Variável | Uso |
|---|---|
| `ADMIN_EMAIL`, `ADMIN_NOME`, `ADMIN_SENHA` | Administrador do ERP, criado ou atualizado a cada início |
| `FUNCIONARIO_EMAIL`, `FUNCIONARIO_NOME`, `FUNCIONARIO_SENHA` | Funcionário do ERP (opcional) |
| `DEMO_DADOS`, `DEMO_SENHA` | Dados fictícios para a apresentação (uma vez por banco) |
| `CORS_ORIGENS` | Endereços dos sites que podem chamar a API |
| `SITE_URL` | Endereço público do site, usado no link de nova senha |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | SMTP do e-mail de nova senha (opcional: sem ele, o administrador gera o link pelo ERP) |
| `DB_PASSWORD`, `DOCKERHUB_USUARIO`, `VERSAO` | Deploy com Docker na EC2 (ver [`.env.example`](.env.example)) |

## Como contribuir

1. Cada tarefa tem uma **issue** no [quadro do projeto](https://github.com/users/dannnpereira/projects/1).
2. Crie uma branch a partir da `main`: `feature/...`, `fix/...`, `docs/...` ou `ci/...`.
3. Use commits no padrão `tipo(área): descrição`, por exemplo `feat(erp): ...` ou `fix(site): ...`.
4. Abra o pull request com `Closes #número` na descrição para a issue fechar sozinha no merge.

## Equipe

- Danilo Pereira da Silva ([@dannnpereira](https://github.com/dannnpereira))
- Livia Ghirardi do Amaral ([@liviaghirardi](https://github.com/liviaghirardi))
