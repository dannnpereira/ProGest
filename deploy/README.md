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
nano .env                  # troque DB_PASSWORD por uma senha forte e salve (Ctrl+O, Enter, Ctrl+X)
docker compose up -d --build
```

O primeiro build demora (de 5 a 15 minutos). Depois, acesse:

- Site: `http://SEU_ELASTIC_IP/`
- Login: `http://SEU_ELASTIC_IP/login`
- ERP: `http://SEU_ELASTIC_IP/erp/`

Comandos úteis:

```bash
docker compose ps                     # o que está rodando
docker compose logs -f backend        # logs do backend (Ctrl+C para sair)
```

## 4. Atualizar depois de um merge na main

```bash
cd ProGest
git pull
docker compose up -d --build
```

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
- **Pendente:** as rotas `/api/clientes`, `/api/pedidos`, `/api/financeiro` e `/api/workflow` ainda são abertas
  (qualquer pessoa com o endereço consegue consultar). Antes de usar com dados reais, é preciso um token de login (JWT).
- Sem um domínio, o site roda em **HTTP**, e a senha do login trafega sem criptografia.
  Para a apresentação isso funciona, mas com um domínio dá para ativar HTTPS gratuito com o Certbot (Let's Encrypt).
