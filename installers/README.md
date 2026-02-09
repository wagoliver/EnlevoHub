# 📦 Instaladores do PostgreSQL

Esta pasta deve conter os instaladores do PostgreSQL para distribuição offline.

---

## 🎯 Para Preparar o Pacote de Distribuição

Baixe os instaladores do PostgreSQL e coloque nesta pasta antes de criar o ZIP final.

---

## 📥 Downloads

### Windows (Necessário)

```powershell
# Via PowerShell
Invoke-WebRequest -Uri "https://get.enterprisedb.com/postgresql/postgresql-16.4-1-windows-x64.exe" -OutFile "postgresql-16.4-1-windows-x64.exe"

# Ou via curl (se disponível)
curl -L -o postgresql-16.4-1-windows-x64.exe https://get.enterprisedb.com/postgresql/postgresql-16.4-1-windows-x64.exe
```

**Download Manual**: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

- Arquivo: `postgresql-16.4-1-windows-x64.exe`
- Tamanho: ~250 MB
- Versão: PostgreSQL 16.4

---

### Linux (Necessário)

```bash
# Via curl
curl -L -o postgresql-16.4-1-linux-x64.bin https://get.enterprisedb.com/postgresql/postgresql-16.4-1-linux-x64.bin

chmod +x postgresql-16.4-1-linux-x64.bin
```

**Download Manual**: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

- Arquivo: `postgresql-16.4-1-linux-x64.bin`
- Tamanho: ~200 MB
- Versão: PostgreSQL 16.4

---

### macOS (Opcional)

Para macOS, o instalador usa **Homebrew** automaticamente durante a instalação.
Não é necessário incluir instalador no pacote.

Se quiser incluir mesmo assim:

```bash
# Download do instalador interativo
curl -L -o postgresql-16.4-1-macos-x64.dmg https://get.enterprisedb.com/postgresql/postgresql-16.4-1-osx-binaries.zip
```

---

## 📁 Estrutura Esperada

Após baixar os instaladores, a pasta deve ficar assim:

```
installers/
├── README.md (este arquivo)
├── postgresql-16.4-1-windows-x64.exe    (250 MB)
├── postgresql-16.4-1-linux-x64.bin      (200 MB)
└── postgresql-16.4-1-macos-x64.dmg      (180 MB - opcional)
```

---

## ✅ Verificação

Para verificar se os arquivos foram baixados corretamente:

### Windows
```cmd
dir postgresql-*.exe
```

### Linux/Mac
```bash
ls -lh postgresql-*.{bin,dmg}
```

---

## 🔍 Checksums (Opcional)

Para garantir a integridade dos downloads:

### Windows
```powershell
Get-FileHash postgresql-16.4-1-windows-x64.exe -Algorithm SHA256
```

### Linux/Mac
```bash
shasum -a 256 postgresql-16.4-1-linux-x64.bin
```

---

## ⚠️ IMPORTANTE

1. **NÃO commite estes arquivos no Git** (já estão no .gitignore)
2. Os instaladores são necessários **apenas para criar o pacote de distribuição**
3. Durante desenvolvimento, você pode rodar `install.bat` sem os instaladores (ele vai baixar automaticamente)
4. Para distribuição final, inclua os instaladores no ZIP para instalação offline

---

## 🚀 Como o Instalador Usa Estes Arquivos

Quando o usuário executa `install.bat` ou `./install`:

1. **Detecta PostgreSQL**: Verifica se já está instalado
2. **Se não estiver instalado**, pergunta:
   - **Opção 1** (Recomendada): Usar instalador local (desta pasta)
   - **Opção 2**: Baixar versão mais recente (internet)
   - **Opção 3**: Usar PostgreSQL já instalado manualmente
3. **Se escolher Opção 1**: Usa o arquivo desta pasta (rápido, offline)
4. **Se escolher Opção 2**: Baixa da internet (sempre a mais nova)

---

## 📝 Versões

| Versão EnlevoHub | PostgreSQL | Data |
|------------------|------------|------|
| v1.0.0 | 16.4 | 2024 |

---

## 🔗 Links Úteis

- **PostgreSQL Official**: https://www.postgresql.org/download/
- **EnterpriseDB Downloads**: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
- **PostgreSQL Release Notes**: https://www.postgresql.org/docs/release/

---

**Dica**: Se você está apenas desenvolvendo, não precisa baixar estes arquivos.
O instalador vai baixar automaticamente quando necessário.
