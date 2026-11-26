# Arquivos dos diagramas

Imagens prontas para a documentação (PNG em alta resolução e SVG vetorial), geradas a partir dos fontes `.mmd` (Mermaid, com o [mermaid-cli](https://github.com/mermaid-js/mermaid-cli)) e `.puml` (PlantUML, notação UML).

| Diagrama | Imagem | Fonte |
|---|---|---|
| Casos de uso: site | [PNG](casos-de-uso-site.png) · [SVG](casos-de-uso-site.svg) | [casos-de-uso-site.mmd](casos-de-uso-site.mmd) |
| Casos de uso: ERP | [PNG](casos-de-uso-erp.png) · [SVG](casos-de-uso-erp.svg) | [casos-de-uso-erp.mmd](casos-de-uso-erp.mmd) |
| **Casos de uso UML: site** (para a documentação ABNT) | [PNG](casos-de-uso-uml-site.png) · [SVG](casos-de-uso-uml-site.svg) | [casos-de-uso-uml-site.puml](casos-de-uso-uml-site.puml) |
| **Casos de uso UML: ERP** (para a documentação ABNT) | [PNG](casos-de-uso-uml-erp.png) · [SVG](casos-de-uso-uml-erp.svg) | [casos-de-uso-uml-erp.puml](casos-de-uso-uml-erp.puml) |
| Banco de dados (DER) | [PNG](banco-de-dados.png) · [SVG](banco-de-dados.svg) | [banco-de-dados.mmd](banco-de-dados.mmd) |
| Ciclo de vida do pedido | [PNG](ciclo-do-pedido.png) · [SVG](ciclo-do-pedido.svg) | [ciclo-do-pedido.mmd](ciclo-do-pedido.mmd) |
| Tabelas antigas | [PNG](banco-de-dados-tabelas-antigas.png) · [SVG](banco-de-dados-tabelas-antigas.svg) | [banco-de-dados-tabelas-antigas.mmd](banco-de-dados-tabelas-antigas.mmd) |

`casos-de-uso.mmd` é a versão com site e ERP juntos, igual à de `docs/diagrama-casos-de-uso.md`. Para imagem, use as duas versões separadas, que ficam mais legíveis.

`casos-de-uso.puml` é a versão UML com site e ERP juntos; como imagem ela fica larga demais, por isso as versões separadas acima.

Os `.puml` usam o layout ELK (`!pragma layout elk`), que já vem no PlantUML e dispensa o Graphviz:

```bash
java -DPLANTUML_LIMIT_SIZE=8192 -jar plantuml.jar -charset UTF-8 -tpng casos-de-uso-uml-erp.puml
```

Para gerar de novo os diagramas Mermaid depois de mudar um fonte:

```bash
npx -p @mermaid-js/mermaid-cli mmdc -i banco-de-dados.mmd -o banco-de-dados.png -b white -s 3
```
