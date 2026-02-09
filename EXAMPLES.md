# 📋 Exemplos de Saída - EnlevoHub

## ✅ Modo Normal

### START (Sucesso)
```
Starting EnlevoHub...

[Starting] Frontend server...
[Waiting] Starting frontend...
[Checking] Verifying frontend...

URL:  http://localhost:3000

Commands:
  Stop:      enlevohub.bat stop
  Status:    enlevohub.bat status
  Restart:   enlevohub.bat restart

========================================
SUCCESS: EnlevoHub started
========================================

(navegador abre automaticamente)
```

### STOP (Sucesso)
```
Stopping EnlevoHub...

  Stopped: Frontend (PID 50628)

========================================
SUCCESS: EnlevoHub stopped
========================================

```

### STATUS (Running)
```
EnlevoHub Status
================

Service         Name                      Status      PID       Port
-------         ----                      ------      ---       ----
Frontend        frontend-service          RUNNING     50628     3000
Backend         backend-service           STOPPED     -         -
Database        postgres-database         STOPPED     -         -
Daemon          enlevohub-daemon          STOPPED     -         -

Overall Status: RUNNING

Health Checks:
  Frontend:     OK (http://localhost:3000)
  Backend:      STOPPED
  API Docs:     NOT AVAILABLE

Resources:
  Log Size:     0 KB
  Memory:       145 MB

Quick Actions:
  View logs:    type logs\frontend.log
  Restart:      enlevohub.bat restart
  Stop:         enlevohub.bat stop

```

---

## 🔍 Modo Debug

### START com --debug
```cmd
enlevohub.bat start --debug
```

**Saída:**
```
Starting EnlevoHub...

[Starting] Frontend server...

[DEBUG] Opening frontend window (visible for debugging)...

[Waiting] Starting frontend...
[Checking] Verifying frontend...

URL:  http://localhost:3000

Commands:
  Stop:      enlevohub.bat stop
  Status:    enlevohub.bat status
  Restart:   enlevohub.bat restart

[DEBUG] Frontend window: "EnlevoHub Frontend [DEBUG]"
[DEBUG] Check the window for detailed logs
[DEBUG] Port: 3000
[DEBUG] PID: 50628

========================================
SUCCESS: EnlevoHub started
========================================

[DEBUG] Browser NOT auto-opened (debug mode)
[DEBUG] Open manually: http://localhost:3000

```

**Diferenças no modo debug:**
- ✅ Janela do frontend fica VISÍVEL (não minimizada)
- ✅ Título da janela inclui "[DEBUG]"
- ✅ Mostra informações extras (PID, porta, nome da janela)
- ✅ Navegador NÃO abre automaticamente (para você ver os logs primeiro)
- ✅ Você pode ver os logs do Vite em tempo real

---

## ❌ Modo Normal - Falha

### START (Falha)
```
Starting EnlevoHub...

[Starting] Frontend server...
[Waiting] Starting frontend...
[Checking] Verifying frontend...
  [Attempt 1/6] Waiting for frontend to start...
  [Attempt 2/6] Waiting for frontend to start...
  [Attempt 3/6] Waiting for frontend to start...
  [Attempt 4/6] Waiting for frontend to start...
  [Attempt 5/6] Waiting for frontend to start...
  [Attempt 6/6] Waiting for frontend to start...

========================================
FAILED: Could not start EnlevoHub
========================================

Possible causes:
  - Port 3000 already in use by another application
  - Node.js not installed or not in PATH
  - Missing dependencies

Troubleshooting:

  1. Check if port 3000 is already in use:
     netstat -ano | findstr ":3000"

  2. If port is in use, stop the other application
     or restart your computer

  3. For advanced troubleshooting, see logs:
     Check the EnlevoHub Frontend window for errors

  4. Get help:
     See TROUBLESHOOTING.md for more solutions

```

---

## 🔄 RESTART

### RESTART (Normal)
```
Restarting EnlevoHub...

Stopping EnlevoHub...

  Stopped: Frontend (PID 50628)

========================================
SUCCESS: EnlevoHub stopped
========================================

Waiting 3 seconds...

Starting EnlevoHub...

[Starting] Frontend server...
[Waiting] Starting frontend...
[Checking] Verifying frontend...

URL:  http://localhost:3000

Commands:
  Stop:      enlevohub.bat stop
  Status:    enlevohub.bat status
  Restart:   enlevohub.bat restart

========================================
SUCCESS: EnlevoHub started
========================================

```

---

## 💡 Quando Usar --debug

### ✅ Use --debug quando:

1. **Primeira execução**
   - Para ver se tudo está configurado corretamente
   - Ver logs de inicialização

2. **Problemas de inicialização**
   - Frontend não inicia
   - Erros desconhecidos
   - Quer ver o que está acontecendo

3. **Desenvolvimento**
   - Modificando código
   - Testando mudanças
   - Debugando problemas

### ❌ Não use --debug quando:

1. **Uso normal diário**
   - Só quer usar o sistema
   - Tudo está funcionando
   - Não precisa ver logs

2. **Produção**
   - Sistema em uso
   - Usuários finais

---

## 🎯 Comparação: Antes vs Depois

### ❌ ANTES (Muitas linhas ===)
```
========================================
  Starting EnlevoHub...
========================================

========================================

  SUCCESS: EnlevoHub started

========================================

  URL:  http://localhost:3000

========================================

Commands:
  Stop: enlevohub.bat stop
```

### ✅ DEPOIS (Limpo e direto)
```
Starting EnlevoHub...

URL:  http://localhost:3000

Commands:
  Stop:      enlevohub.bat stop
  Status:    enlevohub.bat status
  Restart:   enlevohub.bat restart

========================================
SUCCESS: EnlevoHub started
========================================
```

**Melhorias:**
- ✅ Menos poluição visual
- ✅ SUCCESS é a ÚLTIMA mensagem (mais destacada)
- ✅ Informações importantes ANTES do SUCCESS
- ✅ Apenas uma linha === para destacar o final

---

## 🔧 Comandos Disponíveis

```cmd
# Normal
enlevohub.bat start
enlevohub.bat stop
enlevohub.bat status
enlevohub.bat restart

# Com debug
enlevohub.bat start --debug
enlevohub.bat --debug start

# Ajuda
enlevohub.bat
```

---

**Output muito mais limpo e profissional!** 🎯
