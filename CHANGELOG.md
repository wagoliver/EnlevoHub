# 📝 Changelog - EnlevoHub

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

---

## [Unreleased]

### Adicionado
- ✅ Instalador automático multiplataforma (`bin/install.bat`, `bin/install`)
- ✅ 3 opções de instalação do PostgreSQL:
  - Instalador local (offline, rápido)
  - Download online (sempre atualizado)
  - PostgreSQL existente (manual)
- ✅ Instalador do PostgreSQL incluído no pacote (356 MB)
- ✅ Documentação completa de distribuição (`DISTRIBUICAO.md`)
- ✅ Sistema de autenticação JWT completo
- ✅ Multi-tenancy com isolamento por empresa
- ✅ RBAC com 3 roles e 40+ permissões
- ✅ Dashboard com layout moderno
- ✅ Interface responsiva com Tailwind CSS + shadcn/ui

### Alterado
- 🔒 **BREAKING CHANGE**: Senha padrão do PostgreSQL mudada de `enlevohub2024` para `EnlevoHub-Secure`
  - Mais genérica e profissional
  - Sem referência temporal
  - Aplicada em todos os scripts e documentação
- 🔒 JWT_SECRET atualizado para formato mais genérico
- 📦 Estrutura de distribuição melhorada com instaladores locais

### Segurança
- Senha padrão mais forte: `EnlevoHub-Secure`
- JWT secret sem referências temporais
- Documentação de segurança para produção

---

## Fase 2 - Concluída ✅

### Backend
- [x] Sistema de autenticação JWT
- [x] Refresh tokens (7 dias)
- [x] Multi-tenancy completo
- [x] RBAC (3 roles, 40+ permissões)
- [x] Middleware de autenticação
- [x] Middleware de autorização
- [x] Hash de senhas (bcrypt 12 rounds)
- [x] Prisma ORM configurado
- [x] Fastify com plugins

### Frontend
- [x] Layout principal com navegação
- [x] Páginas de Login e Registro
- [x] Dashboard inicial
- [x] Zustand store com persistência
- [x] API client com auto-refresh
- [x] Rotas protegidas
- [x] Componentes shadcn/ui
- [x] Tailwind CSS configurado

### DevOps
- [x] Scripts de controle (`bin/enlevohub.bat`, `bin/enlevohub`)
- [x] Instalador automático multiplataforma
- [x] Suporte offline (instalador local)
- [x] Documentação completa

---

## Fase 1 - Concluída ✅

### Infraestrutura
- [x] Monorepo configurado (Turborepo)
- [x] Backend com Fastify
- [x] Frontend com React + Vite
- [x] PostgreSQL como banco de dados
- [x] Prisma ORM
- [x] TypeScript em todo projeto
- [x] ESLint e Prettier

---

## Próximas Fases

### Fase 3 - Módulo de Projetos (Próximo)
- [ ] CRUD de projetos/obras
- [ ] Dashboard de projetos
- [ ] Upload de imagens
- [ ] Timeline de evolução
- [ ] Gestão de unidades por projeto

### Fase 4 - Módulo de Compras
- [ ] CRUD de materiais
- [ ] Ordens de compra
- [ ] Dashboard de compras
- [ ] Relatórios de gastos

### Fase 5 - Módulo Financeiro
- [ ] CRUD de transações
- [ ] Dashboard financeiro
- [ ] Gráficos e métricas
- [ ] Integração OpenBank
- [ ] Exportação de relatórios

---

## Informações Importantes

### Credenciais Padrão

**PostgreSQL**:
- Host: `localhost`
- Port: `5432`
- Database: `enlevohub`
- User: `postgres`
- Password: `EnlevoHub-Secure`

⚠️ **PRODUÇÃO**: Mude estas credenciais antes de ir para produção!

### Estrutura de Distribuição

```
EnlevoHub-v1.0.0/
├── install.bat / install       # Instaladores
├── installers/
│   └── postgresql-*.exe        # PostgreSQL (356 MB)
├── packages/
│   ├── backend/
│   └── frontend/
└── docs/
```

---

**Versão Atual**: Em Desenvolvimento
**Última Atualização**: 2024
**Status**: Fase 2 Completa, iniciando Fase 3

---

Para mais detalhes, veja:
- [README.md](./README.md) - Visão geral e início rápido
- [INSTALACAO.md](./INSTALACAO.md) - Guia de instalação
- [DISTRIBUICAO.md](./DISTRIBUICAO.md) - Como preparar pacote de distribuição
