# Roadmap: Alta Disponibilidade e Escalabilidade Horizontal

## Diagnostico Atual

### Pontos unicos de falha (SPOF)

| Componente | Situacao | Risco |
|---|---|---|
| **Daemon** | 1 processo master | CRITICO |
| **Backend API** | 1 instancia Fastify | CRITICO |
| **PostgreSQL** | 1 instancia, sem replicas | CRITICO |
| **Storage** | Filesystem local | CRITICO |
| **Load Balancer** | Nao existe | ALTO |
| **Cache** | Nao existe | MEDIO |

### O que ja funciona a favor

- **Backend stateless** — JWT puro, sem session server-side. Qualquer instancia pode atender qualquer request.
- **Health checks** — daemon verifica saude a cada 30s e reinicia processos (ate 3x).
- **Multi-tenancy por tenantId** — a logica de isolamento ja existe.
- **Storage configuravel** — pagina `/settings/storage` permite apontar para shares de rede.

### O que impede escalar

1. **Daemon monolitico** — gerencia PostgreSQL + Backend + Frontend como filhos. Nao permite multiplas instancias do backend.
2. **Storage local** — amarrado a maquina. Segundo backend em outro servidor nao ve os mesmos arquivos.
3. **Banco unico sem replica** — sem read replicas, sem failover, sem backup automatizado.
4. **Metricas in-memory** — MetricsCollector guarda dados no processo. Instancias diferentes tem metricas diferentes.
5. **Sem load balancer** — nao tem nginx/HAProxy na frente.

---

## Etapas de Implementacao

### Etapa 1 — Load Balancer (nginx ou HAProxy)

**Prioridade:** CRITICA
**Esforco:** Baixo

```
Cliente -> nginx (round-robin) -> Backend A
                                -> Backend B
                                -> Backend N
```

Como o backend ja e stateless (JWT), qualquer instancia serve. Basta colocar um reverse proxy na frente.

**Acoes:**
- Instalar nginx no servidor
- Configurar upstream com health checks
- Round-robin ou least-connections
- SSL termination no nginx
- Subir 2+ instancias do backend em portas diferentes

---

### Etapa 2 — Storage Compartilhado

**Prioridade:** CRITICA
**Esforco:** Baixo

Trocar filesystem local por storage acessivel por todas as instancias.

**Opcoes (em ordem de simplicidade):**

| Opcao | Descricao | Esforco |
|---|---|---|
| **NFS/SMB** | Share de rede. Funciona com codigo atual (basta apontar path via `/settings/storage`) | Baixo |
| **MinIO** | S3-compatible self-hosted. Requer refatorar UploadService para SDK S3 | Medio |
| **AWS S3 / Azure Blob** | Cloud storage. Mesmo refactor do MinIO | Medio |

**Recomendacao:** Comecar com NFS/SMB (zero mudanca de codigo), migrar para MinIO quando necessario.

---

### Etapa 3 — PostgreSQL com Replicas

**Prioridade:** CRITICA
**Esforco:** Medio

**Arquitetura alvo:**
```
Backend -> PgBouncer -> Primary (writes)
                     -> Replica 1 (reads)
                     -> Replica N (reads)
```

**Acoes:**
- Configurar streaming replication (primary -> replica)
- Instalar PgBouncer para connection pooling (hoje sao 100 conexoes diretas)
- Separar reads/writes no Prisma (prisma client com read replica extension)
- Failover automatico com Patroni ou repmgr
- Backup automatizado com pg_basebackup + WAL archiving
- Testar recovery

---

### Etapa 4 — Cache Distribuido (Redis)

**Prioridade:** ALTA
**Esforco:** Medio

**Usar Redis para:**
- Cache de queries frequentes (tenant settings, permissions, RBAC)
- Token revocation list (hoje nao existe — logout nao invalida JWT)
- Rate limiting distribuido (por tenant/IP)
- Filas de background jobs (se necessario)

**Acoes:**
- Instalar Redis
- Criar camada de cache no backend (cache-aside pattern)
- Implementar invalidacao de cache por tenant
- Adicionar rate limiter distribuido

---

### Etapa 5 — Orquestracao (Docker / Kubernetes)

**Prioridade:** ALTA
**Esforco:** Alto

Substituir o daemon por orquestracao de containers.

**Fase A — Docker Compose (ambientes simples):**
```yaml
services:
  nginx:
    image: nginx
    ports: ["80:80", "443:443"]
  backend:
    build: ./packages/backend
    deploy:
      replicas: 3
  postgres:
    image: postgres:16
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7
```

**Fase B — Kubernetes (producao seria):**
- Deployments com auto-scaling (HPA)
- Health probes (liveness + readiness)
- Rolling updates (zero downtime deploy)
- ConfigMaps e Secrets
- Persistent volumes para PostgreSQL

**Acoes:**
- Criar Dockerfile para backend e frontend
- Criar docker-compose.yml
- Testar localmente com multiplas replicas
- Migrar para K8s quando necessario

---

### Etapa 6 — Metricas Centralizadas

**Prioridade:** MEDIA
**Esforco:** Medio

Substituir MetricsCollector in-memory por stack de observabilidade.

**Stack recomendada:**
- **Prometheus** — coleta de metricas (scraping)
- **Grafana** — dashboards e alertas
- **Loki** — logs centralizados (substitui logs locais)
- **OpenTelemetry** — distributed tracing

**Acoes:**
- Expor endpoint `/metrics` no backend (formato Prometheus)
- Configurar Prometheus para scraping
- Criar dashboards Grafana (requests, latencia, erros, DB, storage)
- Configurar alertas (disco cheio, DB down, alta latencia)
- Centralizar logs com Loki

---

## Resumo de Prioridades

| Etapa | O que resolve | Esforco | Impacto |
|---|---|---|---|
| 1. Load Balancer | Backend SPOF | Baixo | ALTO |
| 2. Storage compartilhado | Storage SPOF | Baixo | ALTO |
| 3. PostgreSQL replicas | Database SPOF | Medio | CRITICO |
| 4. Redis cache | Performance + token revocation | Medio | ALTO |
| 5. Docker/K8s | Auto-scaling + zero downtime | Alto | ALTO |
| 6. Metricas centralizadas | Visibilidade operacional | Medio | MEDIO |

---

## Ordem Recomendada

1. **Etapas 1 + 2** juntas (baixo esforco, resolvem os SPOFs mais faceis)
2. **Etapa 3** (banco e o SPOF mais critico)
3. **Etapa 4** (cache melhora performance e resolve gaps de seguranca)
4. **Etapa 5** (orquestracao para operacao profissional)
5. **Etapa 6** (observabilidade para operar com confianca)

---

*Documento criado em 2026-02-09*
*Ultima atualizacao: 2026-02-09*
