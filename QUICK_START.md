# EnlevoHub - Guia Rápido

## 🚀 Instalação em 3 Passos

### 1️⃣ Setup Inicial (Primeira vez apenas)
```bash
npm run setup
```

### 2️⃣ Iniciar o Sistema
```bash
npm start
```

### 3️⃣ Acessar
- Frontend: http://localhost:3000
- API: http://localhost:3001/api/v1
- Docs: http://localhost:3001/docs

---

## 📝 Comandos Principais

### Gerais
```bash
npm start              # Inicia o sistema completo
npm run dev            # Modo desenvolvimento (hot reload)
npm run stop           # Para todos os processos
npm run build          # Build de produção
npm run clean          # Limpa builds
```

### Backend
```bash
cd packages/backend

# Prisma
npm run prisma:studio      # Interface visual do banco
npm run prisma:generate    # Gera Prisma Client
npm run prisma:migrate     # Cria migration
npm run prisma:push        # Aplica schema ao banco

# Desenvolvimento
npm run dev                # Inicia API em dev mode
npm run build              # Build
```

### Frontend
```bash
cd packages/frontend

npm run dev                # Inicia frontend em dev mode
npm run build              # Build para produção
npm run preview            # Preview do build
```

### Daemon
```bash
cd packages/daemon

npm run dev                # Roda daemon em dev mode
npm run build              # Build
```

---

## 🔍 Verificação Rápida

### Sistema Funcionando?
```bash
# Backend Health Check
curl http://localhost:3001/health

# Resposta esperada:
# {"status":"ok","timestamp":"...","uptime":...}
```

### Ver Logs em Tempo Real
```bash
# Windows
type logs\enlevohub.log

# Linux/Mac
tail -f logs/enlevohub.log
```

---

## 🛠️ Solução de Problemas

### Porta Ocupada
O sistema encontra automaticamente portas disponíveis. Verifique os logs para ver quais foram usadas.

### PostgreSQL não inicia
```bash
# Instale PostgreSQL no sistema ou
# Baixe versão portable: https://www.postgresql.org/download/

# Coloque em: runtime/postgres/
```

### Erro de Build
```bash
npm run clean
rm -rf node_modules packages/*/node_modules
npm run setup
```

### Reset do Banco de Dados
```bash
cd packages/backend
npm run prisma:push -- --force-reset
```

---

## 📁 Estrutura Rápida

```
EnlevoHub/
├── packages/
│   ├── daemon/      → Gerenciador de processos
│   ├── backend/     → API Fastify + Prisma
│   ├── frontend/    → React App
│   └── shared/      → Tipos compartilhados
├── scripts/         → start.js, stop.js, setup.js
├── runtime/         → PostgreSQL portable
└── logs/            → Logs do sistema
```

---

## 🎯 Tarefas Comuns

### Criar um Novo Modelo no Banco
1. Edite `packages/backend/prisma/schema.prisma`
2. Execute `cd packages/backend && npm run prisma:push`
3. O Prisma Client será regenerado automaticamente

### Adicionar Nova Rota na API
1. Crie em `packages/backend/src/modules/[modulo]/routes.ts`
2. Registre em `packages/backend/src/routes/index.ts`

### Adicionar Nova Página no Frontend
1. Crie em `packages/frontend/src/features/[feature]/pages/`
2. Adicione rota em `packages/frontend/src/App.tsx`

### Adicionar Componente UI (shadcn/ui)
```bash
cd packages/frontend
npx shadcn-ui@latest add [component-name]
```

---

## 🔐 Configuração (.env)

```env
# Database
DATABASE_URL="postgresql://enlevohub:enlevohub@localhost:5432/enlevohub"

# Application
NODE_ENV="development"
PORT=3000
API_PORT=3001

# JWT
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
```

---

## 📚 Recursos

- **Documentação Completa**: README.md
- **Próximos Passos**: NEXT_STEPS.md
- **Resumo da Implementação**: IMPLEMENTATION_SUMMARY.md
- **Guia do Claude Code**: CLAUDE.md

---

## 💡 Dicas

1. Use `npm run dev` para desenvolvimento com hot reload
2. Use `npm run prisma:studio` para visualizar/editar dados
3. Logs estão em `logs/enlevohub.log`
4. API docs em `http://localhost:3001/docs` (Swagger)
5. Use `npm run clean` antes de builds de produção

---

**Precisa de ajuda?** Consulte README.md ou NEXT_STEPS.md
