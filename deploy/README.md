# Deploy do ProGest na AWS (EC2)

Tudo roda em **uma única EC2** com Docker Compose:

```
Internet ─► EC2 :80
             └─ web (Nginx)
                 ├─ /        → site do cliente (progest/)
                 ├─ /erp/    → painel de gestão (erp/)
                 └─ /api/*   → backend (Spring Boot, porta 8081 interna)
                                └─ volume "progest-data" → banco H2 em arquivo
```

O banco é **H2 em arquivo**, guardado em um volume do Docker. Ele sobrevive a reinícios
e a novos deploys. Para trocar por Postgres/RDS no futuro, basta mudar `DB_URL`,
`DB_USER` e `DB_PASSWORD` (veja `backend/Backend_api/src/main/resources/application-prod.properties`)
e adicionar o driver do Postgres no `pom.xml`.

As imagens **não** são geradas na EC2: a cada merge na `main`, a Action
*Publicar imagens no Docker Hub* gera e publica `progest-frontend` e `progest-api`,
e a EC2 só baixa as imagens prontas. Assim o deploy leva segundos e a instância pequena
não precisa compilar Java nem Angular.

```
merge na main ─► Action ─► Docker Hub (<conta>/progest-frontend, <conta>/progest-api)
                                 └─► EC2: docker compose pull && docker compose up -d
```

## 0. Docker Hub (uma vez só)

1. Crie (ou use) a conta do Docker Hub do ProGest em https://hub.docker.com.
2. **Account settings → Personal access tokens → Generate new token**, com permissão
   **Read & Write**. Copie o token (ele só aparece uma vez). Use o token, nunca a senha da conta.
3. No GitHub, em **Settings → Secrets and variables → Actions** do repositório
   (precisa ser administrador do repositório), crie:
   | Secret | Valor |
   |---|---|
   | `DOCKERHUB_USERNAME` | nome da conta do Docker Hub |
   | `DOCKERHUB_TOKEN` | o token do passo 2 |
4. Em **Actions → Publicar imagens no Docker Hub → Run workflow**, rode na `main`.
   Ao terminar, a conta terá os repositórios `progest-frontend` e `progest-api`.
5. Os repositórios ficam **públicos** (padrão do Docker Hub), e a EC2 baixa sem login.
   As imagens não levam senhas: elas vêm do `.env` da EC2. Se preferir deixá-los privados,
   rode uma vez na EC2 `docker login -u CONTA` (com um token só de leitura).

## 1. Criar a EC2 (console da AWS)

1. **EC2 → Launch instance**
   - Nome: `progest`
   - Imagem (AMI): **Ubuntu Server 24.04 LTS**
   - Tipo: **t3.small** (2 GB de RAM). O `t3.micro` também funciona graças ao swap, mas o build fica bem mais lento.
   - Key pair: crie uma chave (`progest.pem`) e **guarde o arquivo**: sem ele não há acesso por SSH.
   - Armazenamento: 20 GB gp3.
2. **Security group** (regras de entrada):
   | Tipo | Porta | Origem |
   |---|---|---|
   | SSH | 22 | **My IP** (só o seu IP) |
   | HTTP | 80 | 0.0.0.0/0 |
   | HTTPS | 443 | 0.0.0.0/0 (só se for usar domínio) |

   **Não** abra as portas 8081 nem 8080.
3. **Elastic IP:** EC2 → Elastic IPs → *Allocate* → *Associate* com a instância.
   Assim o endereço do site não muda quando a instância reinicia.

## 2. Preparar a instância (uma vez só)

No seu computador (PowerShell), na pasta onde está o `progest.pem`:

```powershell
ssh -i progest.pem ubuntu@SEU_ELASTIC_IP
```

Dentro da EC2:

```bash
git clone https://github.com/dannnpereira/ProGest.git
cd ProGest
bash deploy/setup-ec2.sh   # instala Docker e cria 2 GB de swap
exit                       # saia e entre de novo no SSH
```

## 3. Subir o projeto

```bash
cd ProGest
cp .env.example .env
nano .env                  # preencha DOCKERHUB_USUARIO e troque DB_PASSWORD e ADMIN_SENHA por senhas fortes
                           # (salvar: Ctrl+O, Enter, Ctrl+X)
docker compose pull        # baixa as imagens do Docker Hub
docker compose up -d
```

Para a apresentação, coloque `DEMO_DADOS=true` no `.env` antes do `up`: o banco começa com
clientes, pedidos e o financeiro de exemplo (só na primeira vez de cada banco).

Em um ou dois minutos o backend termina de iniciar. Depois, acesse:

- Site: `http://SEU_ELASTIC_IP/`
- Login do cliente: `http://SEU_ELASTIC_IP/login`
- ERP: `http://SEU_ELASTIC_IP/erp/` (entre com `ADMIN_EMAIL` e `ADMIN_SENHA` do `.env`)

A cada início o backend garante que o administrador do ERP exista com o e-mail e a
senha do `.env`. Para trocar a senha: mude `ADMIN_SENHA` no `.env` e rode `docker compose up -d`.

Comandos úteis:

```bash
docker compose ps                     # o que está rodando
docker compose logs -f backend        # logs do backend (Ctrl+C para sair)
```

## 4. Atualizar depois de um merge na main

Espere a Action *Publicar imagens no Docker Hub* do merge ficar verde (aba **Actions** do GitHub). Então:

```bash
cd ProGest
git pull                   # traz mudanças do docker-compose.yml e deste guia
docker compose pull        # baixa as imagens novas
docker compose up -d       # recria só o que mudou
docker image prune -f      # apaga as imagens antigas (libera disco)
```

**Voltar para uma versão anterior:** cada execução da Action publica também a tag `v<número>`
(o número aparece na lista da aba Actions). Ponha, por exemplo, `VERSAO=v42` no `.env` e rode
`docker compose pull && docker compose up -d`. Para voltar à última, `VERSAO=latest`.

**Sem Docker Hub** (Action com problema, ou para testar uma mudança que não está na `main`):
`docker compose up -d --build` gera as imagens na própria EC2, como antes (de 5 a 15 minutos).

Os dados do banco **não** são apagados. Nunca rode `docker compose down -v`: o `-v` apaga o volume do banco.

## 5. Backup do banco

```bash
bash deploy/backup.sh      # salva em ~/ProGest/backups (mantém os 7 últimos)
```

Para rodar todo dia às 3h: `crontab -e` e adicione:

```
0 3 * * * cd ~/ProGest && bash deploy/backup.sh >> ~/backup.log 2>&1
```

Para baixar um backup para o seu computador:

```powershell
scp -i progest.pem ubuntu@SEU_ELASTIC_IP:~/ProGest/backups/ARQUIVO.tar.gz .
```

## Conta de estudante (AWS Academy Learner Lab)

Se a conta for do **Learner Lab**:

- A EC2 **desliga quando a sessão do lab termina** e volta a ligar quando você clica em *Start Lab*.
  Os containers sobem sozinhos (`restart: unless-stopped`), mas o site só fica no ar enquanto o lab estiver ativo.
- Sem Elastic IP, o IP público **muda** a cada nova sessão.
- Acompanhe o saldo de créditos no painel do lab. Uma `t3.small` ligada o tempo todo custa em torno de US$ 15/mês.
  Pare a instância quando não estiver usando.

## Segurança

- O console do H2 (`/h2-console`) fica **desligado** em produção (perfil `prod`).
- O backend não é exposto diretamente: só o Nginx (porta 80) recebe acessos.
- Senhas guardadas com hash BCrypt; a API nunca devolve senha nem CPF.
- Login e cadastro limitados a ~10 tentativas por minuto por IP (resposta 429), contra quem tenta adivinhar senhas.
- Cabeçalhos de segurança básicos no Nginx (`nosniff`, proteção contra o site ser embutido em outro, etc.).
- O ERP (`/api/erp/*`) e as rotas antigas `/api/clientes`, `/api/pedidos`, `/api/financeiro` e
  `/api/workflow` exigem login do administrador do ERP. Sem login respondem 401; o funcionário recebe 403.
- Sem um domínio, o site roda em **HTTP**, e a senha do login trafega sem criptografia.
  Para a apresentação isso funciona, mas com um domínio dá para ativar HTTPS gratuito com o Certbot (Let's Encrypt).
