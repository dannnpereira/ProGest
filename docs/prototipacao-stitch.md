# Prototipação no Google Stitch: prompts das telas

Prompts para gerar no [Stitch](https://stitch.withgoogle.com) o protótipo de **todas as telas** do sistema: o site da Amaral Alambrados (cliente) e o painel ProGest (ERP).

As telas marcadas como **NOVA** ainda não existem no sistema. Elas são propostas para as próximas etapas e cada uma tem uma issue no GitHub.

## Como usar

1. Crie **dois projetos** no Stitch: um para o **site** e outro para o **ERP**. Cada um tem uma identidade visual própria.
2. No primeiro prompt de cada projeto, cole o **prompt base** (identidade visual) seguido do prompt da primeira tela.
3. Gere uma tela por vez. O Stitch mantém o estilo dentro do projeto, então nas telas seguintes basta colar o prompt da tela e começar com "Mantendo o mesmo estilo, crie…".
4. Gere em **Web (desktop)**. Para as telas que têm versão de celular, peça depois: "Crie a versão mobile desta tela".
5. Se uma tela sair diferente do esperado, corrija com prompts curtos ("deixe a barra lateral mais escura", "troque os ícones por ícones de linha").

---

## Parte 1: Site da Amaral Alambrados (cliente)

### Prompt base: identidade visual do site

```text
Site institucional e de vendas da "Amaral Alambrados", fábrica de telas para alambrado em Sorocaba/SP.
Todo o texto em português do Brasil.
Estilo industrial, técnico e confiável, inspirado em catálogos de engenharia.
Cores: quase preto #111827 para títulos e botões principais, branco #FFFFFF, cinzas #374151, #6B7280,
#9CA3AF, #E5E7EB, e destaque âmbar #D97706 para selos, números de etapa e preços.
Tipografia sem serifa moderna. Títulos em MAIÚSCULAS com espaçamento entre letras.
Botões retangulares com cantos levemente arredondados, texto em MAIÚSCULAS e espaçado.
Cartões brancos com borda cinza clara, sombras discretas. Ícones de linha simples.
Valores em reais no formato R$ 1.234,56. Layout responsivo (desktop e celular).
```

### S1. Página inicial com configurador de orçamento

```text
Crie a página inicial do site da Amaral Alambrados, uma página longa com rolagem:

1. Cabeçalho fixo: logo "AMARAL ALAMBRADOS" à esquerda; à direita os botões "ACOMPANHAR PEDIDO"
   (contorno) e "ENTRAR / CADASTRAR" (preenchido escuro). Quando o cliente está logado, aparecem
   um botão com ícone de pessoa ("Meu perfil") e o botão "SAIR".
2. Hero: título grande sobre telas de alambrado para quadras, chácaras e indústrias, um parágrafo curto,
   dois selos ("Padrão Técnico / Resistência ao Tempo" e "FRETE TÉCNICO / Com Carga Segura / Entrega
   Todo Brasil") e o botão "INICIAR SIMULAÇÃO". À direita, um cartão de produto com o selo
   "PRODUTO MAIS CONFIGURADO", título "Tela para Alambrado" e a especificação "Fio 2,77 mm".
3. Seção "CONFIGURADOR INTELIGENTE DE ALAMBRADO" com o selo "SIMULAÇÃO EM TEMPO REAL" e uma barra de
   progresso de 5 etapas: 1. APLICAÇÃO, 2. MATÉRIA-PRIMA, 3. DIMENSÕES, 4. ACESSÓRIOS, 5. ORÇAMENTO.
   Coluna da esquerda com os blocos numerados:
   - "01 BITOLA DO ARAME (ESPESSURA)": cartões selecionáveis (Fio 12 (2,77 mm), Fio 14 (2,10 mm),
     Fio 16 (1,65 mm)), cada um com uma descrição curta. Link "Tabela de fios".
   - "02 MALHA / ABERTURA DO LOSANGO": grade de cartões (Malha 1", 2", 2 1/2", 3"). Antes de escolher
     o arame, mostra o texto "Escolha o arame primeiro para ver as malhas disponíveis".
   - "03 MEDIDAS DO PROJETO": campo "ALTURA DA TELA (METROS)" e campo "METRAGEM LINEAR" com botões
     - e +; abaixo, dois indicadores: "ÁREA TOTAL DE TELA: 250 m²" e "ESTIMATIVA DE EMBALAGEM: 7 rolos
     de 15 metros".
   - "04 TRATAMENTO ANTICORROSIVO": cartões "Galvanizada a fogo", "Plastificada (PVC)",
     "Plastificada PVC preto".
   - "05 LOCALIZAÇÃO E FRETE TÉCNICO": campo de CEP com botão "CALCULAR POR CEP", campos "NÚMERO" e
     "COMPLEMENTO (OPCIONAL)" e duas opções em cartão: "ENTREGA TÉCNICA PRÓPRIA" (mostra o endereço
     encontrado) e "RETIRADA NA FÁBRICA" (sem custo, em Sorocaba).
   Coluna da direita, fixa na rolagem: cartão escuro "RESUMO TÉCNICO DA CERCA" com o selo
   "ENGENHARIA & ORÇAMENTO", linhas Matéria-prima, Acessórios, Frete técnico, Desconto à vista
   (em verde, negativo), e o "INVESTIMENTO TOTAL" em destaque, com "ou 10x de R$ ... no cartão".
   Botões "FAZER PEDIDO" (ou "FAZER CADASTRO / LOGIN PARA CONTINUAR →" se não estiver logado) e
   "BAIXAR FICHA TÉCNICA E ORÇAMENTO EM PDF".
4. Rodapé escuro com descrição da empresa, bloco "ATENDIMENTO" (endereço, telefone (15) 3231-4537,
   e-mail, horário de segunda a sexta das 08h às 18h), CNPJ e links "Normas Técnicas",
   "Política de Privacidade" e "Termos de Fornecimento".
Na versão mobile: menu lateral (hambúrguer) e uma barra fixa no rodapé com o "INVESTIMENTO TOTAL"
e o botão "VER ORÇAMENTO".
```

### S2. Entrar / Cadastrar

```text
Crie a tela de login e cadastro do portal do cliente da Amaral Alambrados, em duas colunas:
- Esquerda: selo "PORTAL DO CLIENTE", título "Acompanhe seus pedidos e orçamentos em um só lugar"
  e um parágrafo explicando que o cliente acompanha a aprovação, a produção e a entrega.
- Direita: cartão com o título "Olá! Bem-vindo(a) à Amaral Alambrados" e duas abas: "Entrar" e
  "Cadastrar".
  Aba Entrar: campos E-mail e Senha (com ícone de olho para mostrar a senha), caixa "Lembrar de mim",
  link "Esqueceu a senha?" e botão "ENTRAR".
  Aba Cadastrar: Nome completo, CPF (000.000.000-00), Telefone ((00) 00000-0000), E-mail e Senha
  (mínimo de 8 caracteres). Mostre um exemplo de erro em vermelho sob o CPF: "Este CPF já tem
  cadastro. Entrar".
  Abaixo do botão, um aviso curto sobre LGPD e o link "← Voltar para a página inicial".
No celular, a coluna da esquerda vira um cabeçalho curto acima do cartão.
```

### S3. Acompanhar pedido (Meus pedidos)

```text
Crie a tela "Meus pedidos" do portal do cliente.
Cabeçalho: logo "AMARAL ALAMBRADOS", navegação "Início", "Acompanhar pedido" (ativo), "Meu perfil",
o nome do cliente e o botão "Sair".
Introdução: título "Meus pedidos", "Olá, Mariana." e o botão "Novo orçamento".
Faixa verde de confirmação: "✓ Pedido AM-1042 enviado! A Amaral vai conferir as medidas e os materiais."
Bloco de detalhe do pedido selecionado:
- "Pedido AM-1042", "Feito em 12/11/2026", valor total em destaque e botão "📄 Ficha técnica do pedido".
- Etiquetas com a especificação: Fio 12, Malha 2", Galvanizada a fogo, 2,00 m × 120 m.
- "Andamento do pedido" como linha do tempo vertical com 5 etapas: Aprovação, Pagamento, Produção,
  Aguardando entrega (ou "Aguardando retirada") e Finalizado. Etapas concluídas com check e data, a atual destacada com
  "Etapa em andamento" e as futuras em cinza com "Ainda não iniciada".
- Variação: pedido recusado, com aviso vermelho "Este pedido não foi aprovado" e o motivo.
- Cartão com o tipo de frete: "Entrega técnica própria" e o endereço, ou "Retirada na fábrica".
Seção "Todos os pedidos": campo de busca "Buscar por código, medida ou endereço" e tabela com as
colunas Pedido, Data, Especificação, Entrega, Valor, Status (etiqueta colorida: Aguardando aprovação,
Recusado, Em produção, Entregue) e o botão "Ver detalhes".
Rodapé com o cartão escuro "Precisa mudar medidas ou prazo?", "Fale com a fábrica de segunda a sexta,
das 08h às 18h" e o botão "Ligar para (15) 3231-4537".
No celular, a tabela vira uma lista de cartões.
```

### S4. Meu perfil

```text
Crie a tela "Meu perfil" do portal do cliente, com o mesmo cabeçalho de "Meus pedidos"
(item "Meu perfil" ativo).
Título "Meu perfil", subtítulo "Dados informados no seu cadastro" e o botão "Novo orçamento".
Cartão central com avatar circular com as iniciais, nome do cliente, etiqueta "Cliente Amaral
Alambrados" e uma lista de dados: E-mail, Telefone e CPF parcialmente oculto
("***.456.789-** (parte oculta por segurança)").
Texto de ajuda: "Para alterar seus dados, ligue para (15) 3231-4537".
Botões "Acompanhar meus pedidos" e "Sair da conta".
```

### S5. NOVA: Recuperar senha

```text
Crie a tela "Recuperar senha" do portal do cliente, no mesmo estilo da tela de login, em 3 estados:
1. Informar o e-mail: título "Esqueceu a senha?", texto "Informe o e-mail do cadastro e enviaremos um
   link para criar uma nova senha", campo E-mail, botão "ENVIAR LINK" e link "Voltar para o login".
2. Confirmação: ícone de envelope, "Verifique seu e-mail" e o e-mail mascarado (ma***@gmail.com),
   com o link "Reenviar".
3. Nova senha: campos "Nova senha" e "Confirmar nova senha", com dicas de força da senha e o
   botão "SALVAR NOVA SENHA".
```

### S6. NOVA: Política de Privacidade e Termos de Fornecimento

```text
Crie uma página de texto institucional da Amaral Alambrados com o cabeçalho do site, um índice
lateral fixo (Coleta de dados, Uso dos dados, Compartilhamento, Direitos do titular (LGPD),
Contato do encarregado) e o conteúdo em seções com títulos.
Ela serve para "Política de Privacidade" e para "Termos de Fornecimento" (troca só o título e as
seções: Orçamento e validade, Pagamento, Produção e prazo, Entrega técnica, Garantia).
```

---

## Parte 2: ProGest, painel de gestão (ERP)

### Prompt base: identidade visual do ERP

```text
Painel de gestão web (ERP) chamado "ProGest – Gestão Empresarial", usado pela equipe da fábrica
Amaral Alambrados. Todo o texto em português do Brasil.
Estilo de software empresarial moderno, limpo e denso em informação.
Layout: barra lateral fixa à esquerda, escura (#1E2228, topo #14171B, texto #AAB1BC, item ativo
#0D0F12 com marcador âmbar), com o logo ProGest ("Pro" em âmbar + "Gest") e o subtítulo
"Gestão Empresarial". Barra superior branca.
Fundo da página #F4F5F7, cartões brancos #FFFFFF com borda #E6E8EC e cantos arredondados de 10 px.
Texto principal #111418, secundário #4B5563, terciário #8A93A0.
Destaque âmbar #F5B23D (fundo suave #FFF4DC). Sucesso verde-escuro #0F3D2E / #12704A (fundo #E3F4EA).
Erro vermelho #C62828 (fundo #FDECEC).
Fonte Segoe UI / system-ui. Códigos de pedido e números em fonte monoespaçada.
Indicadores (KPIs) em cartões com rótulo pequeno em maiúsculas, valor grande e rodapé explicativo.
Etiquetas (tags) em pílula. Botões: primário escuro, destaque âmbar, perigo vermelho, fantasma.
Ícones de linha. Valores em reais (R$ 1.234,56).
```

### E0. Estrutura do painel (menu e topo)

```text
Crie a estrutura base do painel ProGest, que se repete em todas as telas:
Barra lateral escura com o logo e o título de seção "OPERAÇÃO INDUSTRIAL". Itens com ícone:
Aprovação (com a etiqueta âmbar "4 novos"), Produção e Entregas, Novo Orçamento, Produtos e Valores,
Financeiro, Estoque, Clientes, Configurações. No rodapé da barra, o item "Sair".
Barra superior: campo de busca "Buscar pedido ou cliente" com o atalho "Ctrl K", sino de
notificações com ponto âmbar (ao abrir, um painel com "4 pedido(s) aguardando aprovação" e a lista
#AM-1042 – Nome do cliente) e, à direita, o usuário: nome, "Administrador · admin@amaral.com.br"
e avatar.
Mostre também a variação do perfil Funcionário: o menu tem só "Produção e Entregas" e "Sair", sem
busca nem notificações.
No celular, a barra lateral vira um menu que abre pelo ícone de hambúrguer.
```

### E1. Login do ERP

```text
Crie a tela de login do ProGest em duas metades:
- Esquerda, escura: logo ProGest, selo "PAINEL DE GESTÃO", título "Do pedido no site à entrega na
  obra, em um só lugar", lista com ícones dos módulos (Aprovação de pedidos do site, Produção e
  entregas, Produtos e tabela de preços, Financeiro). Fundo com um padrão sutil de malha em losango
  (como uma tela de alambrado) que esmaece. Rodapé: "Acesso restrito à equipe da Amaral Alambrados".
- Direita, branca: "Entrar no painel", "Use o e-mail e a senha da sua conta de gestão", campos E-mail
  (ícone de envelope, placeholder voce@amaral.com.br) e Senha (ícone de cadeado e botão de olho),
  caixa "Manter conectado neste computador", botão escuro largo "Entrar →",
  texto "Esqueceu a senha? Peça ao administrador do sistema para redefinir" e o link
  "← Voltar ao site da Amaral".
Mostre também os avisos: azul "Sua sessão expirou. Entre de novo para continuar" e vermelho
"E-mail ou senha incorretos".
```

### E2. Aprovação de pedidos do site

```text
Crie a tela "Aprovação de Pedidos do Site" do ProGest (item Aprovação ativo no menu).
Cabeçalho: selo "FILA DE ENTRADA • E-COMMERCE B2B", título, subtítulo "4 pedidos aguardando análise
técnica • Volume total: R$ 48.320,00". À direita, um seletor "Cartões | Tabela" e o botão escuro
"Aprovar em lote (04)".
4 KPIs: Novos pedidos hoje (03, "+1 vs ontem"), Aguardando aprovação (04, etiqueta "Pendente",
com ponto pulsante âmbar), Valor na fila (R$ 48.320,00, "Ticket médio R$ 12.080,00"),
Aprovados hoje (02, etiqueta verde com o valor).
Barra de filtros: busca "Filtrar por cliente, cidade, fio ou malha..." e chips: Todos (4), Fio 12 (2),
Fio 14 (2), Malha 2" (3), Malha 3" (1) | Entrega (3), Retirada (1).
Lista de cartões de pedido, cada um com:
- topo: etiqueta escura "#AM-1042", "há 2 horas", etiqueta âmbar "Aguardando aprovação", e o
  frete ("Entrega • 38 km" com caminhão, ou "Retirada na fábrica");
- cliente: nome, etiqueta "PF", CPF em fonte mono, cidade/UF com ícone de pino, "Destino: endereço";
- valores à direita: Material, Frete técnico (ou "Grátis (FOB)") e "Total do pedido" em destaque;
- etiquetas de especificação: Fio 12 (2,77 mm), Malha 2", Altura: 2,00 m, Metragem: 120 m,
  Galvanizada a fogo (verde, com escudo), "8 rolos de 15 m";
- rodapé: botões "Prévia técnica", "Conversar com o cliente" (WhatsApp), "Recusar" (vermelho) e
  "Aprovar pedido" (escuro).
Mostre um cartão no estado de recusa: campo "Motivo da recusa (opcional)" com o exemplo
"Ex.: crédito não aprovado" e os botões "Confirmar recusa" e "Cancelar".
Estados vazios: "Nenhum pedido aguardando aprovação. Os novos pedidos feitos pelo site aparecem aqui
automaticamente."
```

### E2.1. Prévia técnica e PCP (painel lateral da Aprovação)

```text
Crie um painel lateral (drawer) que abre pela direita sobre a tela de Aprovação, com fundo escurecido.
Título "Prévia técnica & PCP", etiqueta "#AM-1042" e botão fechar.
1. "Desenho técnico automático": um retângulo com a malha em losango desenhada em âmbar sobre fundo
   escuro, cotas "120 m lineares" (embaixo) e "2,00 m" (na lateral), rodapé "Fio 12 • Galvanizada a
   fogo" e a etiqueta verde "Homologável".
2. Dois KPIs: "Consumo de aço: 450 kg (≈ 2 bobinas de 400 kg)" e "Tempo em tear: 1 h 07 min
   (velocidade 1,8 m/min)".
3. Cartão "Logística e roteirização": Área de tela 240 m², Distância 38 km (ida),
   Veículo sugerido "Caminhão 3/4", Apresentação "8 rolos de 15 m", e a nota "Valores estimados a
   partir da especificação; conferir na ordem de produção".
4. Botões: "Baixar memorial descritivo", "Conversar com o cliente" e, largo e escuro,
   "Aprovar pedido".
```

### E3. Produção e Entregas

```text
Crie a tela "Produção e Entregas" do ProGest, um quadro Kanban.
Cabeçalho: selo "WORKFLOW DE PRODUÇÃO", título, subtítulo "Acompanhe cada pedido aprovado do tear
até a entrega na obra" e o botão "Ver fila de aprovação" (só para o administrador).
4 KPIs: Na fila do tear (03), Em produção (03, "360 m lineares em fabricação"), Entregues no mês (04),
Atrasados (01, cartão com borda e destaque vermelhos, "Previsão de entrega vencida").
3 colunas com título, contador e descrição: "A fazer" (aprovados aguardando início),
"Em produção" (no tear), "Entregue" (concluídos).
Cartões de ordem: etiqueta "#AM-1040", prazo ("Entrega em 3 dias" com calendário, ou vermelho
"Atrasado 2 dias", ou verde "Entregue 18/11"), nome do cliente, cidade/UF, especificação em fonte mono
("Fio 14 • Malha 2" / 1,80 m × 80 m • Plastificada (PVC)"), tipo de frete e valor.
Botão de ação no cartão: "Iniciar produção" (âmbar) em "A fazer"; "Marcar como entregue" (escuro) ou
"Marcar como retirado" em "Em produção". Cartões atrasados com borda vermelha; entregues com borda
verde.
Coluna vazia: "Nenhum pedido nesta etapa".
```

### E4. Novo orçamento

```text
Crie a tela "Novo orçamento" do ProGest. Selo "COMERCIAL", subtítulo "Monte o orçamento para o
cliente com os mesmos preços do site e salve em PDF".
Layout em duas colunas: à esquerda, 3 cartões numerados; à direita, um cartão de resumo fixo.
1. "Cliente", com o seletor "Buscar por CPF | Novo cliente | Sem cadastro".
   - Buscar por CPF: campo de CPF e botão "Buscar". Resultado: cartão do cliente com avatar, nome,
     CPF, telefone, e-mail e a etiqueta verde "Tem conta no site" (ou âmbar "Sem conta no site", com o
     botão "Criar conta"), e o botão "Trocar". Não encontrado: aviso "Nenhum cliente com o CPF ..."
     e o botão "Cadastrar este cliente".
   - Novo cliente: Nome completo, CPF, Telefone, E-mail, "Senha de acesso do cliente" e o botão
     "Criar conta do cliente".
2. "Especificação da tela": selects Arame, Malha e Tratamento; campos Comprimento e Altura com o
   sufixo "metros".
3. "Entrega": seletor "Retirada na fábrica | Entrega técnica"; na entrega, CEP da obra, Número,
   Complemento e o endereço encontrado com ícone de pino.
Resumo: nome do cliente, especificação, "120 m × 2,0 m (240 m²)", linhas Matéria-prima, Acessórios,
Frete técnico, Desconto à vista (verde), "TOTAL À VISTA" grande, "ou 10x de R$ ... no cartão",
botão âmbar largo "Salvar orçamento em PDF" e a dica "Na janela de impressão, escolha Salvar como PDF".
```

### E5. Produtos e Valores (com a Tabela de preços)

```text
Crie a tela "Produtos e Valores" do ProGest, com a etiqueta "Módulo tabela-preço" no título,
subtítulo "Os produtos ativos de Arame, Malha e Tratamento viram opções no site; os valores entram no
orçamento" e o botão "Novo produto".
Grade em duas colunas:
- Esquerda, tabela de produtos: abas Todos (13), Arame (4), Malha (6), Tratamento (3), Acessórios (1)
  e a busca "Filtrar produto...". Colunas: Produto (nome + descrição curta), Categoria (etiqueta),
  Cobrado por, Valor (R$) (para arame/malha/tratamento mostra "Tabela de preços · 6 linhas"),
  Status (interruptor "Ativo no simulador") e ações (editar, excluir com confirmação "Excluir?").
  Linhas inativas esmaecidas. Rodapé "Mostrando 13 de 13 itens cadastrados" e "Sincronizado com o
  site" com ponto verde.
- Direita, 3 cartões empilhados:
  1. "Novo produto / Editar produto" (etiqueta "Cadastro rápido"): Categoria, Nome, Descrição curta
     (opcional), Cobrado por e Valor em R$ (só para Acessórios), interruptor "Ativo no simulador",
     botões "Salvar" e "Cancelar".
  2. "Regras do orçamento": "Desconto à vista nos acessórios (%)" (selo "Pix / transferência") e
     "Parcelas máximas no cartão" (sufixo "x sem juros"), botão "Salvar regras".
  3. "Prévia no orçamento" (etiqueta "Simulador ao vivo"): selects Arame, Malha, Tratamento,
     Comprimento e Altura, e o resultado com Matéria-prima, Acessórios, Desconto e
     "Total no site (retirada na fábrica)".
Abaixo, ocupando a largura toda, o cartão "Tabela de preços": "Preço por combinação de arame + malha +
tipo", botão "Novo preço", abas "Telas (por m²)" e "Arame avulso (por kg)", chips de tipo (Todos,
Galvanizada a fogo, Plastificada (PVC), PVC preto). Colunas: Tipo, Arame, Malha, Peso (kg/m²),
À vista, A prazo e ações. Mostre uma linha em edição, com selects e campos dentro da própria tabela e
os botões "Salvar" e "Cancelar". Linha de produto inativo com a nota "fora do site (produto inativo)".
Rodapé "29 linhas • 24 telas disponíveis no site".
```

### E6. Financeiro

```text
Crie a tela "Financeiro" do ProGest. Subtítulo "Vendas, caixa, contas a receber, compras e saídas".
À direita, um seletor de mês ("Novembro de 2026") e o botão escuro "Exportar".
Abas: Visão geral | Contas a receber | Compras de material | Saídas.
Gere a aba "Visão geral":
- 4 KPIs: Total de vendas (com etiqueta verde "+12% vs mês anterior"), Entradas ("Recebimentos
  liquidados no período"), Saídas (valor em vermelho, "Compras de insumos e despesas fabris") e
  Saldo do caixa ("Entradas menos saídas do mês").
- Cartão "Comparativo Mensal" ("Últimos 6 meses de faturamento e dispêndio"): gráfico de barras
  agrupadas Entradas x Saídas por mês, e abaixo uma tabela Mês, Entradas, Saídas, Saldo.
- Cartão "Movimentações Recentes": extrato com data, descrição, etiqueta Entrada (verde) / Saída
  (vermelha) e valor, com o link "Ver extrato completo".
```

```text
Mantendo o estilo, gere a aba "Contas a receber" do Financeiro:
4 KPIs: Em aberto ("3 pedidos aguardando pagamento"), Vencido (em vermelho, "1 conta além do prazo
de 15 dias"), Vence em 7 dias, Recebido no mês.
Tabela "Contas a Receber" ("Cada pedido aprovado fica pendente e o cliente tem 15 dias para pagar"):
Pedido, Cliente, Emissão, Vencimento, Valor, Status (Pendente âmbar, Vencido vermelho, Pago verde) e
ações ("Registrar pagamento" escuro, ou "Estornar" nas pagas).
Modal "Registrar pagamento": Data do pagamento, Forma de pagamento (PIX, Boleto, Transferência TED, Cartão,
Dinheiro), nota "O valor entra nas Entradas e no extrato do mês do pagamento",
botões "Cancelar" e "Confirmar pagamento".
```

```text
Mantendo o estilo, gere a aba "Compras de material" do Financeiro:
Tabela "Compras de Material" ("Insumos metálicos, concreto e acessórios industriais") com o botão
"Registrar compra", colunas Data, Fornecedor, Material, Quantidade, Valor, Status (select na própria
linha: Pago, A pagar, Atrasado) e ações (editar, excluir). Filtro por status.
Ao lado, cartão "Maiores Fornecedores" com barras horizontais por fornecedor e o "Total em
fornecedores".
Modal "Registrar compra de material": Data, Status, Fornecedor (com sugestões), Material
(ex.: Arame galvanizado Fio 12), Quantidade (ex.: 10 bobinas (3 ton)), Valor.
Depois, a aba "Saídas", no mesmo formato: tabela com Data, Categoria (Salários, Encargos, Aluguel,
Energia, Água, Impostos, Veículos, Frete, Outros), Descrição, Favorecido, Valor, Status; ao lado,
o cartão "Saídas por Categoria" com ranking em barras, "Ainda a pagar" e "Total do mês";
e o modal "Registrar saída".
Mostre também a barra de aviso "Lançamento excluído. Desfazer" no rodapé.
```

### E7. Configurações

```text
Crie a tela "Configurações" do ProGest ("Dados da empresa e preferências do painel"), em grade de
cartões:
1. "Dados da empresa" ("Usados no memorial descritivo e nos contatos com o cliente"): Razão social,
   CNPJ, WhatsApp comercial, Origem do frete e o botão "Salvar".
2. "Usuários do painel" (NOVO): lista com nome, e-mail, perfil (etiqueta Administrador ou
   Funcionário), interruptor Ativo e o botão "Redefinir senha"; botão "Novo usuário".
3. "Dados de demonstração" ("Para preparar a apresentação"): texto explicativo e o botão
   "Restaurar dados de exemplo", com confirmação "Apagar as alterações e voltar aos dados de exemplo?".
```

### E8. NOVA: Usuários do painel (cadastro)

```text
Crie um modal "Novo usuário do painel" sobre a tela de Configurações do ProGest:
Nome, E-mail, Perfil (cartões selecionáveis: "Administrador – acesso a todas as telas" e
"Funcionário – só Produção e Entregas"), Senha provisória (com botão "Gerar senha") e a caixa
"Pedir troca de senha no primeiro acesso". Botões "Cancelar" e "Criar usuário".
```

### E9. NOVA: Estoque de arames

```text
Crie a tela "Estoque de arames" do ProGest (item Estoque ativo no menu). Subtítulo "Bobinas de arame
compradas e consumidas na produção". Botões "Registrar entrada" (escuro) e "Ajuste de estoque".
4 KPIs: Saldo total (12.400 kg), Bobinas em estoque (31), Consumo no mês (3.850 kg),
Itens abaixo do mínimo (2, em vermelho).
Tabela de saldo por arame: Arame (Fio 12, Fio 14, Fio 16, Fio 18), Tratamento (Galvanizado,
PVC, PVC preto), Saldo (kg), Bobinas, Estoque mínimo, barra de nível colorida (verde, âmbar, vermelha)
e a etiqueta "Abaixo do mínimo".
Ao lado, cartão "Reservado para pedidos": pedidos aprovados e o consumo previsto
(área × peso por m²), com o aviso âmbar "Fio 14 PVC insuficiente para o pedido #AM-1045".
Abaixo, "Movimentações": data, tipo (Entrada verde / Saída na produção / Ajuste), arame,
quantidade (kg), fornecedor ou pedido de origem e o responsável.
Modal "Registrar entrada": Arame, Tratamento, Quantidade (kg), Número de bobinas, Fornecedor,
Data, Valor total e a caixa "Lançar também em Compras de material no Financeiro".
```

### E10. NOVA: Clientes

```text
Crie a tela "Clientes" do ProGest. Busca "Buscar por nome, CPF, e-mail ou cidade", filtros
"Com conta no site" e "Só pedidos", e o botão "Novo cliente".
Tabela: Nome, CPF (mono), Telefone, E-mail, Cidade/UF, Nº de pedidos, Total comprado, Último pedido e
a etiqueta "Tem conta" / "Sem conta".
Ao clicar em um cliente, abre um painel lateral com os dados de contato, os botões "Conversar no
WhatsApp" e "Novo orçamento para este cliente", e a lista dos pedidos com status e valor.
```

---

## Checklist das telas

| # | Tela | Sistema | Situação |
|---|---|---|---|
| S1 | Página inicial + configurador | Site | Existe |
| S2 | Entrar / Cadastrar | Site | Existe |
| S3 | Acompanhar pedido | Site | Existe |
| S4 | Meu perfil | Site | Existe |
| S5 | Recuperar senha | Site | **Nova** |
| S6 | Política de Privacidade / Termos | Site | **Nova** |
| E0 | Estrutura (menu e topo) | ERP | Existe (menu ganha Estoque e Clientes) |
| E1 | Login | ERP | Existe |
| E2 | Aprovação de pedidos + E2.1 Prévia técnica | ERP | Existe |
| E3 | Produção e Entregas | ERP | Existe |
| E4 | Novo orçamento | ERP | Existe |
| E5 | Produtos e Valores + Tabela de preços | ERP | Existe |
| E6 | Financeiro (4 abas e modais) | ERP | Existe |
| E7 | Configurações | ERP | Existe (ganha "Usuários do painel") |
| E8 | Usuários do painel | ERP | **Nova** |
| E9 | Estoque de arames | ERP | **Nova** |
| E10 | Clientes | ERP | **Nova** |
