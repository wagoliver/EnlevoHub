# Roadmap: Docker e Escalabilidade Horizontal

## Arquitetura Docker

O EnlevoHub roda em 3 containers independentes, orquestrados pelo Docker Compose:

```
                     ┌──────────────────┐
                     │    F5 / LB       │
                     │  (porta 80/443)  │
                     └────────┬─────────┘
                              │
                     ┌────────▼─────────┐
                     │    Frontend      │
                     │  (nginx + SPA)   │
                     │  proxy /api →    │
                     └────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌───────────┐  ┌───────────┐  ┌───────────┐
        │ Backend 1 │  │ Backend 2 │  │ Backend N │
        │ Fastify   │  │ Fastify   │  │ Fastify   │
        └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                     ┌────────────────┐
                     │   PostgreSQL   │
                     │   (primary)    │
                     └────────────────┘
```

## Containers

| Container | Imagem Base | Funcao |
|---|---|---|
| **postgres** | `postgres:16-alpine` | Banco de dados |
| **backend** | `node:20-alpine` | API Fastify + Prisma |
| **frontend** | `nginx:alpine` | Serve SPA + proxy reverso para backend |

## Arquivos de Infraestrutura

| Arquivo | Descricao |
|---|---|
| `Dockerfile.backend` | Multi-stage build: compila TS → imagem producao com Node 20 |
| `Dockerfile.frontend` | Multi-stage build: compila Vite → imagem producao com nginx |
| `docker-compose.yml` | Orquestra os 3 servicos + volumes + rede |
| `nginx.conf` | Proxy /api → backend, SPA fallback, gzip, cache de assets |
| `docker-entrypoint.sh` | Aguarda PostgreSQL, aplica schema Prisma, inicia backend |
| `.dockerignore` | Exclui node_modules, runtime, logs, .git do build |
| `.env.docker` | Template de variaveis de ambiente para Docker |

## Comandos

```bash
# Subir o sistema completo
docker compose up -d

# Subir com 3 instancias de backend
docker compose up -d --scale backend=3

# Ver logs
docker compose logs -f backend

# Parar tudo
docker compose down

# Parar e apagar volumes (reset total)
docker compose down -v

# Rebuild apos mudancas de codigo
docker compose build && docker compose up -d
```

## Escalando Backend

O backend e stateless (JWT). Para escalar:

```bash
docker compose up -d --scale backend=3
```

O Docker Compose cria 3 containers `backend` na mesma rede interna.
O nginx do frontend resolve `backend:3001` via DNS round-robin do Docker, distribuindo requests entre as 3 instancias automaticamente.

### Com F5 / Load Balancer externo

Para datacenter com F5:

1. Frontend container expoe porta 80
2. F5 aponta para IP do servidor na porta 80
3. nginx dentro do frontend distribui para backends internos
4. Ou: expor cada backend em porta diferente e apontar F5 direto para eles

## Volumes Persistentes

| Volume | Monta em | Conteudo |
|---|---|---|
| `pgdata` | `/var/lib/postgresql/data` | Dados do PostgreSQL |
| `storage` | `/app/storage` | Fotos e documentos enviados |
| `appdata` | `/app/data` | Config files (storage-config.json) |

## Variaveis de Ambiente

Configurar no `.env` (na raiz do projeto):

| Variavel | Default | Descricao |
|---|---|---|
| `DB_PASSWORD` | `enlevohub2026` | Senha do PostgreSQL |
| `DB_PORT` | `5432` | Porta do PostgreSQL (host) |
| `APP_PORT` | `80` | Porta do frontend (host) |
| `JWT_SECRET` | — | Segredo JWT (OBRIGATORIO mudar em producao) |
| `NODE_ENV` | `production` | Ambiente |
| `FRONTEND_URL` | `http://localhost` | URL publica (para links em emails) |
| `LOG_LEVEL` | `info` | Nivel de log |

## Cenario: Datacenter com 5 Servidores

### Distribuicao recomendada

```
Servidor 1 (frontend + backend): nginx + 1 backend
Servidor 2 (backend):            1 backend
Servidor 3 (backend):            1 backend
Servidor 4 (database primary):   PostgreSQL primary
Servidor 5 (database replica):   PostgreSQL replica (standby)
```

### Como implementar

**Servidores 1-3 (aplicacao):**

Cada servidor roda `docker compose` com apenas backend (e frontend no servidor 1).
Todos apontam `DATABASE_URL` para o IP do servidor 4.

**Servidores 4-5 (banco):**

PostgreSQL com streaming replication:
- Servidor 4: primary (aceita writes)
- Servidor 5: replica (aceita reads + failover automatico com Patroni)

### Adicionando nova maquina backend

1. Instalar Docker na nova maquina
2. Copiar `Dockerfile.backend`, `docker-compose.yml`, `.env`
3. Configurar `DATABASE_URL` apontando para o servidor de banco
4. `docker compose up -d backend`
5. Apontar F5 para o novo IP

## O que o Daemon virou

| Antes (Daemon) | Depois (Docker) |
|---|---|
| Inicia PostgreSQL | Container `postgres` com auto-restart |
| Inicia Backend | Container `backend` com auto-restart |
| Inicia Frontend | Container `frontend` com auto-restart |
| Health check 30s | Docker HEALTHCHECK nativo |
| Auto-restart (3x) | `restart: always` (ilimitado) |
| Encontra portas livres | Rede Docker (sem conflito) |
| Roda migrations | `docker-entrypoint.sh` |

O daemon continua funcionando para quem roda sem Docker (`npm start`). Os dois modos coexistem.

## Proximos Passos (apos Docker)

1. **PostgreSQL Replication** — primary/replica com Patroni
2. **Redis** — cache distribuido + token revocation
3. **Storage S3/MinIO** — substituir filesystem por object storage
4. **Kubernetes** — auto-scaling, rolling deploys (quando Docker Compose nao for suficiente)
5. **Monitoramento** — Prometheus + Grafana

---

*Documento criado em 2026-02-09*
*Ultima atualizacao: 2026-02-09*
