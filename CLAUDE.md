# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EnlevoHub** - SaaS completo para gestão e acompanhamento de obras.

Sistema multi-tenant que oferece controle sobre projetos, compras, fornecedores, empreiteiros, corretores, financeiro e vendas de unidades.

## Tech Stack

- **Backend**: Node.js 20+ | Fastify | Prisma | PostgreSQL 16
- **Frontend**: React 18+ | TypeScript | Vite | Tailwind CSS | shadcn/ui
- **Architecture**: Monorepo (Turborepo) | Daemon Process Manager | Portable

## Project Structure

```
EnlevoHub/
├── packages/
│   ├── daemon/          # Master process manager
│   ├── backend/         # Fastify API + Prisma
│   ├── frontend/        # React + Vite
│   └── shared/          # Shared types
├── runtime/             # PostgreSQL portable
├── scripts/             # start.js, stop.js, setup.js
└── docs/                # Documentation
```

## Getting Started

### First Time Setup
```bash
npm run setup    # Installs deps, creates dirs, builds everything
```

### Development
```bash
npm start        # Starts complete system (daemon + postgres + api + frontend)
npm run dev      # Development mode with hot reload
npm run stop     # Stops all processes
```

### Database
```bash
cd packages/backend
npm run prisma:studio      # Open Prisma Studio GUI
npm run prisma:migrate     # Create new migration
npm run prisma:push        # Push schema to DB
```

## Architecture Notes

### Daemon Process
- Single master process manages PostgreSQL, Backend, and Frontend
- Max 3 processes visible in task manager
- Auto-restart on failures
- Health checks every 30s

### Multi-tenancy
- Tenant isolation at database level
- All models have `tenantId`
- Row-level security enforced by Prisma

### Authentication
- JWT + Refresh Tokens
- RBAC: ADMIN, MANAGER, VIEWER
- Tenant-scoped permissions

## Code Guidelines

### Backend (Fastify)
- Routes in `packages/backend/src/modules/[module]/routes.ts`
- Controllers handle business logic
- Services interact with Prisma
- DTOs validated with Zod

### Frontend (React)
- Features in `packages/frontend/src/features/[feature]/`
- Use TanStack Query for data fetching
- Zustand for global state
- shadcn/ui for components

### Database (Prisma)
- Schema: `packages/backend/prisma/schema.prisma`
- Always include `tenantId` in queries (multi-tenancy)
- Use transactions for multi-step operations

## Important Commands

```bash
# Root
npm start                  # Start EnlevoHub
npm run build             # Build all packages
npm run clean             # Clean all builds
npm test                  # Run all tests

# Backend
cd packages/backend
npm run dev               # Start API in dev mode
npm run prisma:generate   # Generate Prisma Client
npm run prisma:studio     # Open Prisma Studio

# Frontend
cd packages/frontend
npm run dev               # Start frontend dev server
npm run build             # Build for production
```

## API Documentation

When backend is running: http://localhost:3001/docs (Swagger UI)

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - JWT signing secret
- `PORT` / `API_PORT` - Application ports
- `OPENBANK_*` - OpenBank integration credentials

## Troubleshooting

**Port conflicts**: System will auto-find available ports if defaults are busy

**Database issues**:
```bash
cd packages/backend
npm run prisma:push --force-reset  # Reset database
```

**Clean reinstall**:
```bash
npm run clean
rm -rf node_modules packages/*/node_modules
npm run setup
```

## Development Workflow

1. Create feature branch
2. Implement changes in relevant package
3. Test locally with `npm run dev`
4. Run type checking: `npm run typecheck`
5. Build: `npm run build`
6. Commit and push

## Deployment

System is designed to be portable:
```bash
npm run build
npm run package  # Creates standalone distributable
```

---

**Status**: ✅ Fase 1 (Setup e Infraestrutura) COMPLETA

**Next**: Fase 2 - Core e Autenticação
