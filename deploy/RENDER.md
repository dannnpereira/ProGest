# Backend no Render + sites na Vercel

**Backend publicado:** <https://progest-backend-n2g6.onrender.com> (teste: `/api/saude`).
Os dois `vercel.json` já repassam `/api` para ele.

Alternativa mais simples que a EC2 (ver `README.md`), boa para apresentar o projeto.

> **Limitações do plano grátis do Render** (confira no site do Render, pode mudar):
> - Sem `DB_URL`, o banco H2 é um arquivo dentro do servidor e **volta vazio a cada deploy
>   ou reinício** (pedidos, cadastros e produtos somem). **Use o Supabase** (grátis):
>   passo a passo em [SUPABASE.md](SUPABASE.md).
> - O serviço **dorme depois de ~15 min sem uso**. O primeiro acesso depois disso leva
>   cerca de 1 minuto; nesse tempo os sites mostram "Não foi possível conectar ao servidor".

## 1. Criar o serviço no Render

### Jeito rápido: Blueprint (recomendado)

O arquivo `render.yaml` na raiz do repositório já tem toda a configuração.

1. Em <https://dashboard.render.com> → **New** → **Blueprint**.
2. Conecte o GitHub e escolha o repositório (branch `main`).
3. O Render mostra o serviço `progest-backend` e pede **ADMIN_SENHA**: digite a senha do ERP.
4. **Deploy Blueprint**. Pule para o passo 6 abaixo.

### Jeito manual

1. Em <https://dashboard.render.com> → **New** → **Web Service**.
2. Conecte o GitHub e escolha o repositório (o original ou o seu fork).
   Repositório público também pode ser colado em **Public Git Repository**.
3. Preencha:

| Campo | Valor |
|---|---|
| Branch | `main` |
| **Root Directory** | `backend/Backend_api` ← o Dockerfile está aqui |
| Language / Runtime | **Docker** |
| Instance Type | Free |
| Health Check Path (em *Advanced*) | `/api/saude` |

4. Em **Environment Variables**:

| Variável | Valor |
|---|---|
| `ADMIN_SENHA` | senha do administrador do ERP (mínimo 8 caracteres) — **só aqui, nunca no código** |
| `ADMIN_EMAIL` | `amaralalambrados109@gmail.com` (opcional, já é o padrão) |
| `FUNCIONARIO_EMAIL` | e-mail do funcionário (opcional) — só vê **Produção e Entregas** |
| `FUNCIONARIO_SENHA` | senha do funcionário (mínimo 8 caracteres) — **só aqui, nunca no código** |
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | banco Postgres do Supabase — ver [SUPABASE.md](SUPABASE.md). **Sem eles os dados somem a cada reinício** |

> Os usuários são recriados a cada início a partir dessas variáveis. Para trocar uma
> senha, mude a variável em **Environment** e salve: o Render reinicia sozinho.

Não precisa definir porta, perfil nem memória: o Dockerfile já cuida disso
(`SPRING_PROFILES_ACTIVE=prod`, porta da variável `PORT` do Render, limite de memória).

5. **Create Web Service**. O primeiro build leva de 5 a 10 minutos.
6. Teste no navegador: `https://SEU-SERVICO.onrender.com/api/saude` deve mostrar `{"status":"ok"}`.

## 2. Ligar os sites da Vercel ao backend

Nos dois arquivos `progest/vercel.json` e `erp/vercel.json`, adicione a regra do `/api`
**antes** da regra do `index.html` (troque `SEU-SERVICO` pelo endereço do Render):

```json
"rewrites": [
  { "source": "/api/:path*", "destination": "https://SEU-SERVICO.onrender.com/api/:path*" },
  { "source": "/((?!api/).*)", "destination": "/index.html" }
]
```

Assim o navegador chama `/api` no próprio domínio da Vercel, que repassa para o Render
(não precisa liberar CORS). Faça commit, e a Vercel publica sozinha.

> Se preferir chamar o Render direto de outro domínio, defina no Render
> `CORS_ORIGENS=https://seu-site.vercel.app,https://seu-erp.vercel.app`.

## 3. Problemas comuns

| Sintoma no Render | Causa / solução |
|---|---|
| `Dockerfile not found` / `could not find pom.xml` | **Root Directory** vazio. Use `backend/Backend_api`. |
| Log: `ADMIN_SENHA nao definida` | Falta a variável `ADMIN_SENHA` (mínimo 8 caracteres). |
| `Exited with status 137` / *out of memory* | Não sobrescreva `JAVA_TOOL_OPTIONS` com valores maiores que 350 MB. |
| *No open ports detected* / *Port scan timeout* | Build antigo. Faça **Manual Deploy → Clear build cache & deploy**. |
| Site mostra "Não foi possível conectar ao servidor" | Backend dormindo (aguarde 1 min) ou falta o rewrite do passo 2. |
| Login do ERP com senha certa dá erro | Confira `ADMIN_SENHA` no Render; após mudar, o Render reinicia sozinho. |
