# 🚀 Instalação do EnlevoHub

## ⚡ Instalação Automática (Recomendado)

O instalador faz **TUDO automaticamente**:
- ✅ Detecta e instala PostgreSQL se necessário
- ✅ Configura banco de dados
- ✅ Instala dependências
- ✅ Roda migrations
- ✅ Deixa tudo pronto para usar

---

## 🪟 Windows

```cmd
# Executar instalador
bin\install.bat

# Aguardar instalação (5-15 minutos)

# Iniciar sistema
bin\enlevohub.bat start
```

---

## 🐧 Linux

```bash
# Executar instalador (pode pedir senha sudo)
./bin/install

# Aguardar instalação (5-15 minutos)

# Iniciar sistema
./bin/enlevohub start
```

---

## 🍎 macOS

```bash
# Executar instalador (requer Homebrew)
./bin/install

# Aguardar instalação (5-15 minutos)

# Iniciar sistema
./bin/enlevohub start
```

---

## 📋 O que o Instalador Faz

### 1. Verifica PostgreSQL
- Detecta se PostgreSQL está instalado
- Se não estiver, oferece 3 opções:
  1. **Instalar do pacote local** (Recomendado - Rápido, offline)
  2. **Baixar versão mais recente** (Online, sempre atualizado)
  3. **Usar PostgreSQL já instalado** (Manual)

### 2. Instala PostgreSQL (se necessário)

O instalador oferece **3 opções**:

#### Opção 1: Instalar do Pacote Local (Recomendado)
- Usa instalador incluído na pasta `installers/`
- ✅ **Rápido**: 5-7 minutos
- ✅ **Offline**: Não precisa de internet
- ✅ **Testado**: Versão garantida e compatível
- 📦 Tamanho: ~250MB (Windows), ~200MB (Linux)

#### Opção 2: Baixar Versão Mais Recente
- Baixa da internet automaticamente
- ✅ **Atualizado**: Sempre a versão mais nova
- ✅ **Segurança**: Patches mais recentes
- ❌ **Requer internet**: Download de ~200-250MB
- ⏱️ **Mais demorado**: 10-15 minutos

#### Opção 3: Usar PostgreSQL Existente
- Usa instalação já configurada no sistema
- ✅ **Sem instalação**: Não instala nada novo
- ✅ **Integração**: Com setup existente
- ⚙️ **Requer**: PostgreSQL 14+ já instalado e rodando

**Instalação por Sistema**:

**Windows**:
- Opção 1: Instalador silencioso local
- Opção 2: Download de https://get.enterprisedb.com/

**Linux**:
- Opção 1: Instalador binário local
- Opção 2: Ubuntu/Debian `apt-get`, RedHat/Fedora `yum/dnf`

**macOS**:
- Via Homebrew: `brew install postgresql@16`

### 3. Configura Banco de Dados
- Cria database `enlevohub`
- Define senha: `EnlevoHub-Secure`
- Configura acesso

### 4. Instala Dependências
- Roda `npm install`
- Instala todas as dependências do projeto

### 5. Configura Aplicação
- Cria arquivos `.env`
- Roda migrations do Prisma
- Cria tabelas no banco

### 6. Finaliza
- Sistema pronto para usar!

---

## 🔧 Requisitos Prévios

### Todos os Sistemas
- **Node.js 20+** (obrigatório)
  - Download: https://nodejs.org/

### Windows (Opcional - Acelera Instalação)
- **Chocolatey** (opcional)
  - Install: https://chocolatey.org/install

### Linux
- **sudo** (para instalar PostgreSQL)

### macOS
- **Homebrew** (obrigatório)
  - Install: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

---

## ⏱️ Tempo de Instalação

| Sistema | Com PostgreSQL | Sem PostgreSQL |
|---------|---------------|----------------|
| Windows | 10-15 min | 3-5 min |
| Linux | 5-10 min | 2-3 min |
| macOS | 5-10 min | 2-3 min |

---

## 🐛 Troubleshooting

### "Node.js is not installed"
**Solução**: Instale Node.js 20+
- https://nodejs.org/

### "Failed to download PostgreSQL" (Windows)
**Solução**: Instale manualmente
1. Download: https://www.postgresql.org/download/windows/
2. Senha: `EnlevoHub-Secure`
3. Execute `bin\install.bat` novamente

### "Homebrew is not installed" (macOS)
**Solução**: Instale Homebrew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### "Permission denied" (Linux/Mac)
**Solução**: Torne o script executável
```bash
chmod +x install
./bin/install
```

### PostgreSQL já instalado mas com senha diferente
**Solução**: Edite `.env` e ajuste a senha:
```bash
# packages/backend/.env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/enlevohub"
```

---

## 🎯 Após a Instalação

1. **Iniciar Sistema**:
   ```bash
   # Windows
   bin\enlevohub.bat start

   # Linux/Mac
   ./bin/enlevohub start
   ```

2. **Acessar**: http://localhost:3000

3. **Criar Conta**:
   - Clique em "Cadastre-se"
   - Preencha os dados
   - Pronto!

---

## 📊 Informações do Sistema Após Instalação

**PostgreSQL**:
- Host: `localhost`
- Port: `5432`
- Database: `enlevohub`
- User: `postgres`
- Password: `EnlevoHub-Secure`

**Backend API**:
- URL: http://localhost:3001
- Docs: http://localhost:3001/docs

**Frontend**:
- URL: http://localhost:3000

---

## 🔒 Segurança

⚠️ **IMPORTANTE**: A senha padrão (`EnlevoHub-Secure`) é para desenvolvimento.

**Para produção**:
1. Mude a senha do PostgreSQL
2. Atualize `DATABASE_URL` no `.env`
3. Mude `JWT_SECRET` no `.env`

---

## 🆘 Suporte

Se o instalador falhar:
1. Veja a seção Troubleshooting acima
2. Consulte `TROUBLESHOOTING.md`
3. Instale PostgreSQL manualmente e rode o instalador novamente

---

**Instalação deve ser rápida e sem complicações!** 🎉
