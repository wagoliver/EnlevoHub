# 🎮 Comandos do EnlevoHub - Estilo Splunk

## 📋 Todos os Comandos Disponíveis

### 🚀 INICIAR o EnlevoHub
```cmd
bin\enlevohub.bat start
```

**O que faz:**
- ✅ Verifica dependências (instala se necessário)
- ✅ Verifica builds (compila se necessário)
- ✅ Cria arquivos de configuração (.env)
- ✅ Inicia o daemon master
- ✅ Sobe Frontend + Backend + PostgreSQL
- ✅ Abre o navegador automaticamente
- ✅ Mostra URLs de acesso

**Exemplo de uso:**
```cmd
D:\EnlevoHub> bin\enlevohub.bat start

========================================
  Starting EnlevoHub...
========================================

[Setup] Building daemon...
[Setup] Building backend...
[Starting] EnlevoHub Daemon...

========================================
  EnlevoHub Started!
========================================

  Frontend: http://localhost:3000
  API:      http://localhost:3001
  Docs:     http://localhost:3001/docs

  Logs: .\logs\enlevohub.log

  To stop: enlevohub.bat stop
========================================
```

---

### 🛑 PARAR o EnlevoHub
```cmd
bin\enlevohub.bat stop
```

**O que faz:**
- ✅ Para todos os processos do EnlevoHub
- ✅ Fecha Frontend, Backend e PostgreSQL
- ✅ Limpa processos Node.js relacionados
- ✅ Graceful shutdown

**Exemplo de uso:**
```cmd
D:\EnlevoHub> bin\enlevohub.bat stop

========================================
  Stopping EnlevoHub...
========================================

  EnlevoHub stopped.
```

---

### 🔄 REINICIAR o EnlevoHub
```cmd
bin\enlevohub.bat restart
```

**O que faz:**
- ✅ Executa `stop`
- ✅ Aguarda 2 segundos
- ✅ Executa `start`

**Exemplo de uso:**
```cmd
D:\EnlevoHub> bin\enlevohub.bat restart

========================================
  Stopping EnlevoHub...
========================================

  EnlevoHub stopped.

(aguardando 2 segundos...)

========================================
  Starting EnlevoHub...
========================================

  EnlevoHub Started!
```

---

### 📊 VER STATUS do EnlevoHub (DETALHADO!)
```cmd
bin\enlevohub.bat status
```

**O que faz:**
- ✅ Verifica se o EnlevoHub está rodando
- ✅ Mostra **PIDs de todos os processos**
- ✅ Lista **portas abertas** (3000, 3001, 5432) com PIDs
- ✅ Faz **health checks** (testa se serviços respondem)
- ✅ Mostra **uso de memória** por processo
- ✅ Exibe **tamanho dos logs e database**
- ✅ Sugere **quick actions** para próximos passos

**Exemplo de uso quando RODANDO:**
```cmd
D:\EnlevoHub> bin\enlevohub.bat status

========================================
  EnlevoHub Status Report
========================================

  Overall Status: ●  RUNNING

  ┌─ PROCESSES
  │
  │  ✓ Daemon Master
  │    PID: 12345
  │    Memory: 85,234 KB
  │
  │  Node.js Processes:
  │    PID: 12345 | Memory: 85,234 KB
  │    PID: 12346 | Memory: 124,567 KB
  │
  └─

  ┌─ PORTS
  │
  │  ✓ Frontend: http://localhost:3000 (PID: 12346)
  │  ✓ Backend API: http://localhost:3001 (PID: 12347)
  │  ○ PostgreSQL: Port 5432 not in use
  │
  └─

  ┌─ HEALTH CHECKS
  │
  │  ✓ Frontend: Responding
  │  ✓ Backend: Healthy
  │  ✓ API Docs: Available at http://localhost:3001/docs
  │
  └─

  ┌─ RESOURCES
  │
  │  Log file: 234 KB (logs\enlevohub.log)
  │  Database: Not initialized
  │
  └─

========================================

  Quick Actions:
    View logs:  type logs\enlevohub.log
    Restart:    enlevohub.bat restart
    Stop:       enlevohub.bat stop
```

**Exemplo de uso quando PARADO:**
```cmd
D:\EnlevoHub> bin\enlevohub.bat status

========================================
  EnlevoHub Status Report
========================================

  Overall Status: ●  STOPPED

  No EnlevoHub processes running.

  To start: enlevohub.bat start

========================================
```

---

## 🔍 Ver Ajuda

```cmd
bin\enlevohub.bat
```

**Mostra:**
```
Usage: enlevohub.bat {start|stop|restart|status}
```

---

## 📝 Exemplos Práticos

### Workflow Normal de Desenvolvimento

```cmd
# 1. Iniciar pela manhã
bin\enlevohub.bat start

# 2. Trabalhar...

# 3. Ver se está rodando
bin\enlevohub.bat status

# 4. Reiniciar após mudanças
bin\enlevohub.bat restart

# 5. Parar no final do dia
bin\enlevohub.bat stop
```

---

### Verificar Logs

```cmd
# Ver logs completos
type logs\enlevohub.log

# Ver últimas 20 linhas (PowerShell)
Get-Content logs\enlevohub.log -Tail 20

# Monitorar em tempo real (PowerShell)
Get-Content logs\enlevohub.log -Wait -Tail 10
```

---

## 🐧 Linux/Mac

Os mesmos comandos funcionam no Linux/Mac com o script `bin/enlevohub`:

```bash
# Iniciar
bin/enlevohub start

# Parar
bin/enlevohub stop

# Reiniciar
bin/enlevohub restart

# Status
bin/enlevohub status
```

---

## 🆚 Comparação com Splunk

| Splunk | EnlevoHub |
|--------|-----------|
| `/opt/splunk/bin/splunk start` | `bin\enlevohub.bat start` |
| `/opt/splunk/bin/splunk stop` | `bin\enlevohub.bat stop` |
| `/opt/splunk/bin/splunk restart` | `bin\enlevohub.bat restart` |
| `/opt/splunk/bin/splunk status` | `bin\enlevohub.bat status` |

---

## 💡 Dicas

### Criar Atalho (Windows)

1. Clique com botão direito na área de trabalho
2. Novo → Atalho
3. Localize: `D:\EnlevoHub\bin\enlevohub.bat`
4. Adicione argumento: `start`
5. Nomeie: "EnlevoHub"

Agora você pode clicar duas vezes no atalho para iniciar!

### Adicionar ao PATH (Opcional)

Para rodar de qualquer lugar:

```cmd
# Adicionar ao PATH do sistema
setx PATH "%PATH%;D:\EnlevoHub\bin"

# Depois, de qualquer pasta:
enlevohub start
enlevohub status
enlevohub stop
```

---

## ⚙️ Variáveis de Ambiente

Você pode customizar o comportamento com variáveis de ambiente no arquivo `.env`:

```env
# Pular PostgreSQL (dev mode)
SKIP_POSTGRES=true

# Mudar portas
PORT=3000
API_PORT=3001

# Nível de log
LOG_LEVEL=debug
```

---

## 🚨 Solução de Problemas

### Comando não encontrado
```cmd
# Use caminho completo
D:\EnlevoHub\bin\enlevohub.bat start
```

### Porta ocupada
O sistema encontra automaticamente uma porta disponível. Verifique os logs para a porta usada.

### Processo travado
```cmd
# Force stop
taskkill /F /IM node.exe
taskkill /F /IM postgres.exe

# Depois tente novamente
bin\enlevohub.bat start
```

---

**Criado em 2025** | EnlevoHub - Comandos Estilo Splunk 🚀
