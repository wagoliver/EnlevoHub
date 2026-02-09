# 🧪 Como Testar o Comando Start

## ✅ O que foi Corrigido

1. ✅ Removido o daemon complexo (estava causando falha)
2. ✅ Agora inicia **apenas o Frontend** (mais simples e confiável)
3. ✅ Usa uma janela minimizada (não fica pendurada)
4. ✅ Abre o navegador automaticamente
5. ✅ Salva PID para poder parar depois

---

## 🚀 Como Testar - Passo a Passo

### 1️⃣ Abra o CMD (Prompt de Comando)

Pressione `Win + R`, digite `cmd` e pressione Enter

### 2️⃣ Navegue até a pasta do EnlevoHub

```cmd
cd D:\EnlevoHub
```

### 3️⃣ Execute o comando start

```cmd
bin\enlevohub.bat start
```

### 4️⃣ O que deve acontecer:

✅ Uma nova janela **MINIMIZADA** abre com título "EnlevoHub Frontend"
✅ Você verá mensagens no CMD principal:
```
========================================
  Starting EnlevoHub...
========================================

[Starting] EnlevoHub Frontend...

  A new window will open with the frontend server.
  Keep that window open - it's the frontend running.

[Waiting] Starting frontend...
[Checking] Verifying frontend...

========================================
  EnlevoHub Started Successfully!
========================================

  Frontend: http://localhost:3000

  Note: Running in DEV mode (Frontend only)
  For full system, see NEXT_STEPS.md

  Logs: .\logs\frontend.log

  To stop: enlevohub.bat stop
========================================
```

✅ O navegador abre automaticamente em http://localhost:3000
✅ Você vê a página do EnlevoHub!

---

## 📺 Verificar se Está Rodando

### Ver Status

```cmd
bin\enlevohub.bat status
```

Deve mostrar:
```
EnlevoHub Status
================

Service         Name                      Status      PID       Port
-------         ----                      ------      ---       ----
Frontend        frontend-service          RUNNING     12345     3000
Backend         backend-service           STOPPED     -         -
Database        postgres-database         STOPPED     -         -
Daemon          enlevohub-daemon          STOPPED     -         -

Overall Status: RUNNING
...
```

---

## 🛑 Parar o EnlevoHub

```cmd
bin\enlevohub.bat stop
```

Isso irá:
- ✅ Fechar a janela do Frontend
- ✅ Matar o processo Node.js
- ✅ Limpar os arquivos PID

---

## 🔍 Se Algo Der Errado

### Problema: Porta 3000 ocupada

O Vite vai automaticamente usar outra porta (3001, 3002, etc.)
Veja a mensagem no CMD para saber qual porta foi usada.

### Problema: Janela não abre

Verifique se você está no diretório correto:
```cmd
cd D:\EnlevoHub
dir bin
```

Deve listar `enlevohub.bat`

### Problema: Erro de permissão

Execute o CMD como Administrador:
- Win + X
- Escolha "Prompt de Comando (Admin)" ou "Windows PowerShell (Admin)"

---

## 💡 Dicas

### Ver a Janela do Frontend

A janela fica minimizada na barra de tarefas com o título "EnlevoHub Frontend".
Clique nela para ver os logs do Vite em tempo real.

### Manter a Janela Aberta

NÃO feche a janela "EnlevoHub Frontend" manualmente!
Use sempre `bin\enlevohub.bat stop` para parar corretamente.

---

## 🎯 Próximos Passos Após Funcionar

Quando o frontend estiver funcionando:

1. ✅ Você terá acesso à página inicial do EnlevoHub
2. ⏳ Na Fase 2, adicionaremos:
   - Backend API
   - PostgreSQL
   - Sistema de autenticação
   - Daemon completo

---

**Teste agora diretamente no CMD do Windows!** 🚀
