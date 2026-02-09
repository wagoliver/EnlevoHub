# 🔧 EnlevoHub - Troubleshooting

## Problemas Comuns e Soluções

### ❌ Problema: "FAILED: Could not start EnlevoHub"

#### Causa 1: Porta 3000 já está em uso

**Sintoma:**
```
FAILED: Could not start EnlevoHub
Possible causes:
  - Port 3000 already in use by another application
```

**Solução:**

1. Verificar o que está usando a porta 3000:
   ```cmd
   netstat -ano | findstr ":3000"
   ```

2. Se aparecer algo como:
   ```
   TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345
   ```
   O PID 12345 está usando a porta.

3. Descobrir qual programa:
   ```cmd
   tasklist | findstr "12345"
   ```

4. **Opção A**: Fechar o programa que está usando a porta

5. **Opção B**: Reiniciar o computador (limpa todas as portas)

---

#### Causa 2: Node.js não instalado ou não encontrado

**Sintoma:**
A janela do EnlevoHub abre e fecha imediatamente.

**Solução:**

1. Verificar se Node.js está instalado:
   ```cmd
   node --version
   ```

2. Se mostrar erro "comando não encontrado":
   - Baixe Node.js em: https://nodejs.org
   - Instale a versão LTS (recomendada)
   - Reinicie o terminal após instalar

3. Após instalar, tente novamente:
   ```cmd
   enlevohub.bat start
   ```

---

#### Causa 3: Dependências não instaladas

**Sintoma:**
Janela mostra erros sobre módulos não encontrados.

**Solução:**

1. Execute o setup novamente:
   ```cmd
   npm run setup
   ```

2. Se o setup falhar, limpe e reinstale:
   ```cmd
   npm run clean
   npm run setup
   ```

---

### ❌ Problema: Janela do EnlevoHub abre e fecha rapidamente

**Causa:** Erro na inicialização do frontend

**Solução:**

1. Mantenha a janela aberta para ver o erro:
   - Localize a janela "EnlevoHub Frontend" na barra de tarefas
   - Clique para maximizar
   - Leia a mensagem de erro

2. Erros comuns:
   - "Module not found" → Execute `npm run setup`
   - "Port in use" → Veja solução da Porta 3000 acima
   - "Command not found: vite" → Execute `npm run setup`

---

### ❌ Problema: Navegador não abre automaticamente

**Solução:**

1. Abra manualmente:
   - Navegue para: http://localhost:3000

2. Se não carregar, verifique se o frontend está rodando:
   ```cmd
   enlevohub.bat status
   ```

---

### ❌ Problema: "INFO: EnlevoHub was not running" ao parar

**Causa:** Isso NÃO é um erro! É apenas uma informação.

**Explicação:**
Você executou `enlevohub.bat stop` mas não havia nada rodando.

**Solução:**
Nenhuma ação necessária. Isso é normal.

---

### ❌ Problema: Comando `status` mostra tudo STOPPED mas página web funciona

**Causa:** Frontend está rodando mas o script não detecta.

**Solução:**

1. Se a página web está funcionando, está tudo OK!

2. Para forçar limpeza:
   ```cmd
   enlevohub.bat stop
   enlevohub.bat start
   ```

---

### ❌ Problema: Erro de permissão ao executar comando

**Sintoma:**
```
Access denied
Permission denied
```

**Solução:**

1. Execute o CMD ou PowerShell como Administrador:
   - Pressione `Win + X`
   - Escolha "Terminal (Admin)" ou "PowerShell (Admin)"
   - Navegue até `D:\EnlevoHub`
   - Execute o comando

---

### ❌ Problema: Comando não encontrado

**Sintoma:**
```
'enlevohub.bat' is not recognized as an internal or external command
```

**Solução:**

1. Certifique-se de estar no diretório correto:
   ```cmd
   cd D:\EnlevoHub
   ```

2. Execute com o caminho completo:
   ```cmd
   bin\enlevohub.bat start
   ```

---

## 🆘 Ainda com Problemas?

### Reset Completo

Se nada funcionar, tente um reset completo:

```cmd
# 1. Parar tudo
bin\enlevohub.bat stop

# 2. Limpar
npm run clean

# 3. Remover node_modules
rmdir /s /q node_modules
rmdir /s /q packages\frontend\node_modules
rmdir /s /q packages\backend\node_modules
rmdir /s /q packages\daemon\node_modules

# 4. Reinstalar tudo
npm run setup

# 5. Tentar novamente
bin\enlevohub.bat start
```

---

## 📝 Logs Úteis

### Ver Janela do Frontend

A janela "EnlevoHub Frontend" contém os logs em tempo real.

- Procure na barra de tarefas
- Clique para maximizar
- Veja os erros (se houver)

### Verificar Processos

```cmd
# Ver todos os processos Node.js
tasklist | findstr "node.exe"

# Ver portas em uso
netstat -ano | findstr "LISTENING"
```

---

## 💡 Dicas de Prevenção

1. **Sempre use comandos enlevohub**
   - ✅ `enlevohub.bat start`
   - ❌ Não execute `npm run dev` manualmente

2. **Mantenha a janela do Frontend aberta**
   - Não feche manualmente
   - Use `enlevohub.bat stop` para parar

3. **Um EnlevoHub por vez**
   - Não inicie múltiplas instâncias
   - Sempre pare antes de iniciar novamente

---

**Precisa de mais ajuda?** Veja também:
- README.md - Documentação completa
- QUICK_START.md - Guia rápido
- COMANDOS.md - Todos os comandos disponíveis
