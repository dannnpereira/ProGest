# Banco de dados no Supabase (Postgres)

No plano grátis do Render, o banco H2 é um arquivo **dentro** do servidor: a cada deploy
ou reinício (e o Render reinicia quando o serviço dorme) ele volta vazio, e somem pedidos,
clientes e produtos. Com o Supabase, o banco fica fora do servidor e nada se perde.

O backend continua o mesmo: só muda para onde ele grava. As tabelas e os produtos padrão
são criados sozinhos no primeiro início (`schema.sql`).

## 1. Criar o projeto no Supabase

1. Entre em <https://supabase.com> → **New project**.
2. Escolha um nome (ex.: `progest`), uma **senha do banco** (guarde-a) e a região
   **South America (São Paulo)**.
3. Espere o projeto ficar pronto (1 a 2 minutos).

## 2. Pegar os dados de conexão

1. No projeto, clique em **Connect** (no topo).
2. Escolha **Session pooler** (funciona com o Render, que não usa IPv6).
   Não use o *Transaction pooler* (porta 6543).
3. Você verá algo como:

```
host: aws-0-sa-east-1.pooler.supabase.com
port: 5432
database: postgres
user: postgres.abcdefghijklmnop
```

## 3. Configurar no Render

No serviço `progest-backend` → **Environment**, adicione:

| Variável | Valor |
|---|---|
| `DB_URL` | `jdbc:postgresql://HOST:5432/postgres?sslmode=require` (troque `HOST` pelo host acima) |
| `DB_USER` | o `user` acima (ex.: `postgres.abcdefghijklmnop`) |
| `DB_PASSWORD` | a senha do banco escolhida no passo 1 |

Salve. O Render reinicia o backend. Confira `https://SEU-SERVICO.onrender.com/api/saude`.

> A senha **nunca** vai para o código nem para o `render.yaml` (o repositório é público).

## 4. Conferir

- Cadastre um produto no ProGest e faça um pedido de teste no site.
- No Render, clique em **Manual Deploy → Restart service**.
- O produto e o pedido continuam lá. No Supabase, em **Table Editor**, dá para ver as tabelas.

## Observações

- **Dados antigos do Render não vêm junto**: eles já se perdiam a cada reinício.
  O banco novo começa com os produtos e regras padrão; cadastre de novo o que precisar.
- O plano grátis do Supabase **pausa o projeto após 7 dias sem nenhum acesso**. Os dados
  não somem: basta clicar em **Restore** no painel do Supabase.
- Backup manual (recomendado de vez em quando; o que o plano grátis guarda sozinho
  aparece em **Database → Backups** no painel):
  `pg_dump "postgresql://USER:SENHA@HOST:5432/postgres" > backup.sql`.
- No computador nada muda: sem `DB_URL`, o backend usa o H2 em `backend/Backend_api/data/`.
