# 🏗️ EnlevoHub - Sistema de Gestão de Obras

Sistema SaaS completo para gestão e acompanhamento de obras, oferecendo controle sobre compras, evolução, fornecedores, empreiteiros, corretores, financeiro e vendas de unidades.

---

## ⚡ Instalação Rápida

### Windows
```cmd
bin\install.bat
```

### Linux/Mac
```bash
./bin/install
```

**Pronto!** O instalador faz tudo automaticamente:
- ✅ Instala PostgreSQL (se necessário)
- ✅ Configura banco de dados
- ✅ Instala dependências
- ✅ Roda migrations
- ✅ Deixa tudo pronto

### 📦 Opções de Instalação do PostgreSQL

Durante a instalação, você pode escolher:

1. **Instalador Local** (Recomendado) - Usa instalador incluído no pacote
   - ✅ Rápido (5-7 min)
   - ✅ Funciona offline
   - ✅ Versão testada

2. **Download Online** - Baixa versão mais recente da internet
   - ✅ PostgreSQL sempre atualizado
   - ❌ Requer internet
   - ⏱️ Mais demorado (10-15 min)

3. **PostgreSQL Existente** - Usa instalação já configurada
   - ✅ Não instala nada novo
   - ⚙️ Requer PostgreSQL 14+ já instalado

Veja mais detalhes em: [INSTALACAO.md](./INSTALACAO.md) | [DISTRIBUICAO.md](./DISTRIBUICAO.md)

---

## 🚀 Usando o Sistema

### Iniciar
```bash
# Windows
bin\enlevohub.bat start

# Linux/Mac
./bin/enlevohub start
```

### Parar
```bash
# Windows
bin\enlevohub.bat stop

# Linux/Mac
./bin/enlevohub stop
```

### Ver Status
```bash
# Windows
bin\enlevohub.bat status

# Linux/Mac
./bin/enlevohub status
```

### Reiniciar
```bash
# Windows
bin\enlevohub.bat restart

# Linux/Mac
./bin/enlevohub restart
```

### Modo Debug
```bash
# Windows
bin\enlevohub.bat start --debug

# Linux/Mac
./bin/enlevohub start --debug
```

---

## 🌐 Acessar o Sistema

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Documentação API**: http://localhost:3001/docs

---

## 📋 Funcionalidades (Fase 2 - Atual)

### ✅ Implementado
- **Autenticação JWT** - Login, registro, refresh tokens
- **Multi-tenancy** - Isolamento por empresa
- **RBAC** - 3 roles (ADMIN, MANAGER, VIEWER) + 40+ permissões
- **Dashboard** - Visão geral do sistema
- **Layout Moderno** - Interface corporativa e responsiva

### 🚧 Em Desenvolvimento (Fase 3+)
- Módulo de Projetos
- Módulo de Unidades
- Módulo de Fornecedores
- Módulo de Empreiteiros
- Módulo Financeiro
- Módulo de Vendas

---

## 🏗️ Arquitetura

### Stack Tecnológico

**Backend**:
- Node.js 20+
- Fastify (API)
- Prisma (ORM)
- PostgreSQL 16
- JWT + Refresh Tokens
- Zod (Validação)

**Frontend**:
- React 18+
- TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Zustand (State)
- TanStack Query
- React Router

**DevOps**:
- Cross-platform (Windows, Linux, Mac)
- Standalone (sem Docker necessário)
- Instalador automático

---

## 📁 Estrutura do Projeto

```
EnlevoHub/
├── bin/
│   ├── install.bat         # Instalador Windows
│   ├── install             # Instalador Linux/Mac
│   ├── enlevohub.bat       # Script Windows
│   └── enlevohub           # Script Linux/Mac
├── installers/
│   └── postgresql-*.exe    # Instaladores PostgreSQL
├── packages/
│   ├── backend/            # API Backend
│   │   ├── src/
│   │   │   ├── core/       # Auth, Tenancy, RBAC
│   │   │   ├── modules/    # Módulos de negócio
│   │   │   └── lib/        # Utilities
│   │   └── prisma/         # Database schema
│   ├── frontend/           # React App
│   │   └── src/
│   │       ├── components/ # UI Components
│   │       ├── pages/      # Pages
│   │       ├── stores/     # Zustand stores
│   │       └── lib/        # Utilities
│   └── shared/             # Código compartilhado
├── runtime/                # Runtime files (PIDs, logs)
├── logs/                   # Application logs
├── backups/                # Database backups
└── README.md
```

---

## 🔒 Segurança

- ✅ Senhas com bcrypt (12 rounds)
- ✅ JWT com expiração curta (15min)
- ✅ Refresh tokens (7 dias)
- ✅ Validação de entrada (Zod)
- ✅ Isolamento por tenant
- ✅ RBAC granular
- ✅ Auto-refresh de tokens

---

## 📚 Documentação

- [INSTALACAO.md](./INSTALACAO.md) - Guia de instalação detalhado
- [FASE_2_COMPLETA.md](./FASE_2_COMPLETA.md) - O que foi implementado
- [CROSS_PLATFORM.md](./CROSS_PLATFORM.md) - Compatibilidade multiplataforma
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Solução de problemas
- [EXEMPLOS.md](./EXEMPLOS.md) - Exemplos de uso

---

## 🛠️ Desenvolvimento

### Requisitos
- Node.js 20+
- PostgreSQL 16
- npm 10+

### Setup Manual (para desenvolvedores)
```bash
# 1. Instalar dependências
npm install

# 2. Configurar PostgreSQL
createdb -U postgres enlevohub

# 3. Configurar .env
cp packages/backend/.env.example packages/backend/.env
# Editar DATABASE_URL

# 4. Rodar migrations
cd packages/backend
npx prisma migrate dev

# 5. Iniciar em modo dev
# Terminal 1 - Backend
cd packages/backend
npm run dev

# Terminal 2 - Frontend
cd packages/frontend
npm run dev
```

---

## 🧪 Testes

```bash
# TypeScript check
npm run typecheck

# Build
npm run build

# Limpar
npm run clean
```

---

## 📊 Status do Projeto

- **Fase 1**: ✅ Setup e Infraestrutura (Completo)
- **Fase 2**: ✅ Core e Autenticação (Completo)
- **Fase 3**: 🚧 Módulo de Projetos (Próximo)

---

## 🤝 Contribuindo

Este é um projeto privado em desenvolvimento.

---

## 📝 Licença

Proprietary - Todos os direitos reservados

---

## 🆘 Suporte

Problemas? Consulte:
1. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. [INSTALACAO.md](./INSTALACAO.md)
3. Documentação da API: http://localhost:3001/docs

---

**EnlevoHub** - Sistema Profissional de Gestão de Obras 🏗️
