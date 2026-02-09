# 🗄️ Setup do Banco de Dados - PostgreSQL

## ❌ Erro: "Internal Error" no Cadastro

**Causa**: O banco de dados PostgreSQL não está configurado/rodando.

---

## 🚀 Soluções Rápidas (escolha UMA)

### **Opção 1: PostgreSQL com Docker** (Recomendado - Mais Fácil)

Se você tem Docker instalado:

```bash
# Criar e iniciar PostgreSQL em container
docker run --name enlevohub-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=enlevohub \
  -p 5432:5432 \
  -d postgres:16

# Ver se está rodando
docker ps

# Criar as tabelas
cd packages/backend
npx prisma migrate dev --name init

# Testar novamente o cadastro!
```

**Parar/Iniciar depois:**
```bash
docker stop enlevohub-postgres
docker start enlevohub-postgres
```

---

### **Opção 2: PostgreSQL Instalado no Windows**

#### Passo 1: Baixar PostgreSQL
1. Acesse: https://www.postgresql.org/download/windows/
2. Baixe o instalador (versão 16)
3. Execute o instalador

#### Passo 2: Durante a Instalação
- **Password do superuser**: digite `postgres`
- **Port**: deixe `5432`
- **Locale**: deixe padrão

#### Passo 3: Criar o Banco
Abra o "pgAdmin 4" (instalado com PostgreSQL):
1. Clique com botão direito em "Databases"
2. Create > Database
3. Nome: `enlevohub`
4. Save

#### Passo 4: Rodar Migrations
```bash
cd D:\EnlevoHub\packages\backend
npx prisma migrate dev --name init
```

#### Passo 5: Testar!
Agora tente criar a conta novamente.

---

### **Opção 3: PostgreSQL Portable** (Sem Instalação)

```bash
# Baixar PostgreSQL Portable
# Link: https://sourceforge.net/projects/postgresqlportable/

# Extrair em alguma pasta (ex: C:\PostgreSQLPortable)

# Iniciar o servidor
C:\PostgreSQLPortable\App\PgSQL\bin\pg_ctl.exe start -D C:\PostgreSQLPortable\Data

# Criar banco
C:\PostgreSQLPortable\App\PgSQL\bin\createdb.exe -U postgres enlevohub

# Rodar migrations
cd D:\EnlevoHub\packages\backend
npx prisma migrate dev --name init
```

---

## ✅ Verificar se Está Funcionando

```bash
# Testar conexão
cd packages/backend
npx prisma db pull

# Se conectar sem erro, está OK!
```

---

## 🔧 Solução Temporária: Usar Mock (Sem Banco)

Se você não quer instalar PostgreSQL agora, posso criar um mock das rotas de auth para você testar a interface.

**Quer que eu implemente o mock?** Digite "sim" e eu crio rapidamente.

---

## 📊 Qual opção você prefere?

1. **Docker** (5 minutos) - Mais fácil se já tem Docker
2. **Instalação** (15 minutos) - Permanente, mais robusto
3. **Portable** (10 minutos) - Sem instalação, mais leve
4. **Mock** (2 minutos) - Só para testar interface, sem persistência

**Me diga qual você quer e eu te guio passo a passo!** 🚀
