# 📦 Estrutura de Distribuição - EnlevoHub

Este documento explica como preparar o pacote de distribuição do EnlevoHub para usuários finais.

---

## 🎯 Objetivo

Criar um pacote **standalone completo** onde o usuário apenas:
1. Descompacta o ZIP
2. Executa `bin\install.bat` (Windows) ou `./bin/install` (Linux/Mac)
3. Sistema pronto para usar

---

## 📁 Estrutura do Pacote de Distribuição

```
EnlevoHub-v1.0.0/
├── bin/
│   ├── install.bat                      # Instalador Windows
│   ├── install                          # Instalador Linux/Mac
│   ├── enlevohub.bat                    # Script de controle Windows
│   └── enlevohub                        # Script de controle Linux/Mac
├── installers/                          # Instaladores do PostgreSQL
│   ├── postgresql-16.4-1-windows-x64.exe      (250 MB)
│   ├── postgresql-16.4-1-linux-x64.bin        (200 MB)
│   └── postgresql-16.4-1-macos-x64.dmg        (180 MB)
├── packages/
│   ├── backend/                         # API Backend
│   ├── frontend/                        # React Frontend
│   └── shared/                          # Código compartilhado
├── config/
│   └── settings.example.json            # Configurações editáveis
├── runtime/                             # Criado durante instalação
│   └── data/                            # Dados do PostgreSQL
├── logs/                                # Criado durante execução
├── backups/                             # Criado durante backup
├── README.md                            # Guia rápido
├── INSTALACAO.md                        # Guia detalhado de instalação
└── LICENSE.txt                          # Licença

Total: ~500-700 MB (dependendo da plataforma)
```

---

## 🔧 Como Preparar o Pacote

### Passo 1: Baixar Instaladores do PostgreSQL

#### Windows
```bash
# Baixar PostgreSQL 16.4 para Windows
curl -L -o installers/postgresql-16.4-1-windows-x64.exe \
  https://get.enterprisedb.com/postgresql/postgresql-16.4-1-windows-x64.exe
```

#### Linux
```bash
# Baixar PostgreSQL 16.4 para Linux
curl -L -o installers/postgresql-16.4-1-linux-x64.bin \
  https://get.enterprisedb.com/postgresql/postgresql-16.4-1-linux-x64.bin

chmod +x installers/postgresql-16.4-1-linux-x64.bin
```

#### macOS
```bash
# Para macOS, usar Homebrew durante instalação
# Não é necessário incluir instalador no pacote
```

### Passo 2: Build do Projeto

```bash
# Instalar dependências
npm install

# Build de produção
npm run build

# Gerar Prisma Client
cd packages/backend
npx prisma generate
```

### Passo 3: Limpar Arquivos de Desenvolvimento

```bash
# Remover node_modules (usuário vai instalar)
rm -rf node_modules
rm -rf packages/*/node_modules

# Remover arquivos de desenvolvimento
rm -rf packages/*/.next
rm -rf packages/*/dist
rm -rf packages/*/.turbo
rm -rf .turbo

# Remover arquivos sensíveis
rm -rf packages/backend/.env
rm -rf packages/frontend/.env
rm -rf runtime/
rm -rf logs/
rm -rf backups/
```

### Passo 4: Criar o ZIP

#### Windows
```powershell
Compress-Archive -Path EnlevoHub-v1.0.0 -DestinationPath EnlevoHub-v1.0.0-windows.zip
```

#### Linux/Mac
```bash
tar -czf EnlevoHub-v1.0.0-linux.tar.gz EnlevoHub-v1.0.0/
# ou
zip -r EnlevoHub-v1.0.0-mac.zip EnlevoHub-v1.0.0/
```

---

## 🚀 Fluxo de Instalação do Usuário

### Windows

```cmd
# 1. Descompactar
unzip EnlevoHub-v1.0.0-windows.zip

# 2. Entrar na pasta
cd EnlevoHub-v1.0.0

# 3. Executar instalador
bin\install.bat

# Durante instalação, escolher:
# Opção 1: Instalar do pacote local (Recomendado)
# Opção 2: Baixar versão mais recente
# Opção 3: Usar PostgreSQL já instalado

# 4. Aguardar (3-10 minutos)

# 5. Iniciar sistema
bin\enlevohub.bat start

# 6. Acessar: http://localhost:3000
```

### Linux/Mac

```bash
# 1. Descompactar
tar -xzf EnlevoHub-v1.0.0-linux.tar.gz

# 2. Entrar na pasta
cd EnlevoHub-v1.0.0

# 3. Executar instalador
./bin/install

# 4. Aguardar (3-10 minutos)

# 5. Iniciar sistema
./bin/enlevohub start

# 6. Acessar: http://localhost:3000
```

---

## 📋 Opções de Instalação

### Opção 1: Instalador Local (Recomendado)

**Vantagens:**
- ✅ Funciona offline
- ✅ Instalação rápida (5-7 minutos)
- ✅ Versão testada e garantida
- ✅ Não depende de internet

**Quando usar:**
- Ambientes sem internet
- Instalação em múltiplos computadores
- Garantia de versão específica

### Opção 2: Download da Versão Mais Recente

**Vantagens:**
- ✅ PostgreSQL sempre atualizado
- ✅ Correções de segurança mais recentes
- ✅ Pacote de distribuição menor

**Desvantagens:**
- ❌ Requer internet
- ❌ Download de ~200MB
- ❌ Instalação mais demorada (10-15 minutos)

**Quando usar:**
- Conexão de internet estável
- Quer última versão do PostgreSQL
- Pacote de distribuição menor

### Opção 3: Usar PostgreSQL Existente

**Vantagens:**
- ✅ Usa PostgreSQL já configurado
- ✅ Não instala nada novo
- ✅ Integração com setup existente

**Requisitos:**
- PostgreSQL 14+ já instalado
- Usuário `postgres` configurado
- Porta 5432 disponível

**Quando usar:**
- PostgreSQL já instalado e configurado
- Servidor dedicado de banco de dados
- Ambiente corporativo com DBA

---

## 🔒 Segurança

### Senha Padrão

O instalador usa senha padrão: `EnlevoHub-Secure`

⚠️ **IMPORTANTE**: Esta senha é para desenvolvimento/testes.

**Para produção**, após instalação:

```bash
# 1. Mudar senha do PostgreSQL
psql -U postgres
ALTER USER postgres PASSWORD 'nova-senha-forte';

# 2. Atualizar .env
packages/backend/.env
DATABASE_URL="postgresql://postgres:nova-senha-forte@localhost:5432/enlevohub"

# 3. Mudar JWT_SECRET
JWT_SECRET="sua-chave-secreta-aleatoria-128-caracteres"

# 4. Reiniciar
bin\enlevohub.bat restart
```

---

## 📊 Checklist de Release

Antes de criar o pacote de distribuição:

- [ ] Todos os testes passando
- [ ] Build sem erros
- [ ] Versão atualizada em `package.json`
- [ ] CHANGELOG.md atualizado
- [ ] README.md revisado
- [ ] Instaladores do PostgreSQL baixados
- [ ] Scripts testados em todas plataformas
- [ ] Documentação completa
- [ ] Arquivos de desenvolvimento removidos
- [ ] Sem arquivos .env commitados
- [ ] LICENSE.txt incluído

---

## 🎯 Distribuição Multi-Plataforma

### Opção A: Pacote Único Universal (Recomendado para Empresas)

```
EnlevoHub-v1.0.0-complete.zip (1.5 GB)
├── installers/
│   ├── postgresql-windows.exe
│   ├── postgresql-linux.bin
│   └── postgresql-macos.dmg
└── ...
```

**Vantagens:**
- Um único download
- Funciona em qualquer plataforma
- Ideal para distribuição interna

**Desvantagens:**
- Arquivo grande (1.5 GB)

### Opção B: Pacotes Separados por Plataforma (Recomendado para Download Público)

```
EnlevoHub-v1.0.0-windows.zip     (500 MB)
EnlevoHub-v1.0.0-linux.tar.gz    (450 MB)
EnlevoHub-v1.0.0-macos.zip       (400 MB)
```

**Vantagens:**
- Download menor
- Usuário baixa apenas o que precisa
- Ideal para site público

**Desvantagens:**
- Múltiplos arquivos para manter

---

## 🔄 Atualizações Futuras

Para facilitar atualizações:

1. **Versionar os pacotes**: `EnlevoHub-v1.0.0`, `EnlevoHub-v1.1.0`, etc.
2. **Criar script de update**: `update.bat` / `update.sh`
3. **Preservar dados**: Backup automático antes de atualizar
4. **Migrations**: Prisma migrate automático

---

## 🆘 Suporte

Se o usuário tiver problemas:

1. **Logs**: `logs/enlevohub.log`
2. **Documentação**: `INSTALACAO.md`, `TROUBLESHOOTING.md`
3. **Support**: support@enlevohub.com

---

## 📝 Notas Adicionais

### Tamanhos dos Instaladores (Aproximados)

| Componente | Windows | Linux | macOS |
|------------|---------|-------|-------|
| PostgreSQL | 250 MB | 200 MB | 180 MB |
| Node Modules | 150 MB | 150 MB | 150 MB |
| Backend | 20 MB | 20 MB | 20 MB |
| Frontend | 5 MB | 5 MB | 5 MB |
| **Total** | **~425 MB** | **~375 MB** | **~355 MB** |

### Requisitos do Sistema

| Requisito | Mínimo | Recomendado |
|-----------|--------|-------------|
| RAM | 2 GB | 4 GB+ |
| Disco | 2 GB | 5 GB+ |
| CPU | 2 cores | 4+ cores |
| OS | Win 10, Ubuntu 20.04, macOS 11 | Win 11, Ubuntu 22.04, macOS 13 |

---

**EnlevoHub** - Sistema Profissional de Gestão de Obras 🏗️
