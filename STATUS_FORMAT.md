# 📊 EnlevoHub Status - Formato Limpo

## Quando STOPPED

```
EnlevoHub Status
================

Service         Name                      Status      PID       Port
-------         ----                      ------      ---       ----
Frontend        frontend-service          STOPPED     -         -
Backend         backend-service           STOPPED     -         -
Database        postgres-database         STOPPED     -         -
Daemon          enlevohub-daemon          STOPPED     -         -

Overall Status: STOPPED

To start:
  enlevohub.bat start

```

---

## Quando RUNNING

```
EnlevoHub Status
================

Service         Name                      Status      PID       Port
-------         ----                      ------      ---       ----
Frontend        frontend-service          RUNNING     12346     3000
Backend         backend-service           RUNNING     12347     3001
Database        postgres-database         STOPPED     -         -
Daemon          enlevohub-daemon          RUNNING     12345     -

Overall Status: RUNNING

Health Checks:
  Frontend:     OK (http://localhost:3000)
  Backend:      OK (http://localhost:3001)
  API Docs:     OK (http://localhost:3001/docs)

Resources:
  Log Size:     234 KB
  Memory:       145 MB

Quick Actions:
  View logs:    type logs\enlevohub.log
  Restart:      enlevohub.bat restart
  Stop:         enlevohub.bat stop

```

---

## Quando PARCIALMENTE RUNNING (Frontend OK, Backend com problema)

```
EnlevoHub Status
================

Service         Name                      Status      PID       Port
-------         ----                      ------      ---       ----
Frontend        frontend-service          RUNNING     12346     3000
Backend         backend-service           RUNNING     12347     3001
Database        postgres-database         STOPPED     -         -
Daemon          enlevohub-daemon          RUNNING     12345     -

Overall Status: RUNNING

Health Checks:
  Frontend:     OK (http://localhost:3000)
  Backend:      NO RESPONSE (port open but not responding)
  API Docs:     NOT AVAILABLE

Resources:
  Log Size:     234 KB
  Memory:       145 MB

Quick Actions:
  View logs:    type logs\enlevohub.log
  Restart:      enlevohub.bat restart
  Stop:         enlevohub.bat stop

```

---

## Características

✅ **Tabela alinhada** - Fácil de ler
✅ **PIDs visíveis** - Para debug
✅ **Portas claras** - Saber onde acessar
✅ **Status direto** - RUNNING/STOPPED
✅ **Health checks** - Verifica se responde
✅ **Resources** - Uso de memória e logs
✅ **Quick actions** - Próximos comandos

---

## Teste Agora

```cmd
bin\enlevohub.bat status
```
