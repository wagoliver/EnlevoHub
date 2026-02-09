# 🚀 Início Rápido - EnlevoHub

## Comando Estilo Splunk

Agora você pode iniciar o EnlevoHub com um único comando, igual ao Splunk!

### Windows

```cmd
bin\enlevohub.bat start
```

### Linux/Mac

```bash
bin/enlevohub start
```

---

## 📋 Comandos Disponíveis

### Iniciar o Sistema
```bash
bin\enlevohub.bat start       # Windows
bin/enlevohub start            # Linux/Mac
```

### Parar o Sistema
```bash
bin\enlevohub.bat stop        # Windows
bin/enlevohub stop             # Linux/Mac
```

### Reiniciar o Sistema
```bash
bin\enlevohub.bat restart     # Windows
bin/enlevohub restart          # Linux/Mac
```

### Verificar Status
```bash
bin\enlevohub.bat status      # Windows
bin/enlevohub status           # Linux/Mac
```

---

## 🎯 O que acontece quando você executa `start`?

O script automaticamente:

1. ✅ Verifica se as dependências estão instaladas (se não, instala)
2. ✅ Verifica se os packages estão buildados (se não, builda)
3. ✅ Cria o arquivo .env se não existir
4. ✅ Cria diretórios necessários (runtime, logs, backups)
5. ✅ Inicia o daemon master
6. ✅ O daemon inicia:
   - Backend API (porta 3001)
   - Frontend (porta 3000)
   - PostgreSQL (se disponível)
7. ✅ Abre o navegador automaticamente em http://localhost:3000

---

## 🌐 Acessar o Sistema

Após executar `start`, acesse:

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001/api/v1
- **Documentação da API**: http://localhost:3001/docs

---

## 📝 Logs

Os logs são salvos em:
```
logs/enlevohub.log
```

Para ver os logs em tempo real:

**Windows:**
```cmd
type logs\enlevohub.log
```

**Linux/Mac:**
```bash
tail -f logs/enlevohub.log
```

---

## 🛑 Parar o Sistema

```bash
bin\enlevohub.bat stop        # Windows
bin/enlevohub stop             # Linux/Mac
```

---

## ⚡ Modo Desenvolvimento Rápido

Se você quer apenas testar o frontend rapidamente sem o daemon:

```bash
cd packages/frontend
npm run dev
```

Acesse: http://localhost:3000

---

## 🔧 Solução de Problemas

### Erro: "Node não encontrado"
Certifique-se de que o Node.js 20+ está instalado:
```bash
node --version
```

### Erro: "Porta ocupada"
O sistema encontra automaticamente portas disponíveis. Verifique os logs.

### Reset Completo
```bash
bin\enlevohub.bat stop
npm run clean
rm -rf node_modules packages/*/node_modules
npm run setup
bin\enlevohub.bat start
```

---

## 📚 Documentação Completa

- **README.md** - Documentação completa do projeto
- **QUICK_START.md** - Guia rápido de comandos
- **NEXT_STEPS.md** - Próximas fases de desenvolvimento

---

**Criado em 2025** | EnlevoHub - Sistema de Gestão de Obras
