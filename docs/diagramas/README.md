# Arquivos dos diagramas

Imagens prontas para a documentação (PNG em alta resolução e SVG vetorial), geradas a partir dos fontes `.mmd` (Mermaid) com o [mermaid-cli](https://github.com/mermaid-js/mermaid-cli).

| Diagrama | Imagem | Fonte |
|---|---|---|
| Casos de uso: site | [PNG](casos-de-uso-site.png) · [SVG](casos-de-uso-site.svg) | [casos-de-uso-site.mmd](casos-de-uso-site.mmd) |
| Casos de uso: ERP | [PNG](casos-de-uso-erp.png) · [SVG](casos-de-uso-erp.svg) | [casos-de-uso-erp.mmd](casos-de-uso-erp.mmd) |
| Casos de uso: UML completo | — (gerar em plantuml.com) | [casos-de-uso.puml](casos-de-uso.puml) |
| Banco de dados (DER) | [PNG](banco-de-dados.png) · [SVG](banco-de-dados.svg) | [banco-de-dados.mmd](banco-de-dados.mmd) |
| Ciclo de vida do pedido | [PNG](ciclo-do-pedido.png) · [SVG](ciclo-do-pedido.svg) | [ciclo-do-pedido.mmd](ciclo-do-pedido.mmd) |
| Tabelas antigas | [PNG](banco-de-dados-tabelas-antigas.png) · [SVG](banco-de-dados-tabelas-antigas.svg) | [banco-de-dados-tabelas-antigas.mmd](banco-de-dados-tabelas-antigas.mmd) |

`casos-de-uso.mmd` é a versão com site e ERP juntos, igual à de `docs/diagrama-casos-de-uso.md`. Para imagem, use as duas versões separadas, que ficam mais legíveis.

Para gerar de novo depois de mudar um fonte:

```bash
npx -p @mermaid-js/mermaid-cli mmdc -i banco-de-dados.mmd -o banco-de-dados.png -b white -s 3
```
