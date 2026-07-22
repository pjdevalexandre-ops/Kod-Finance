# 🧪 Guia de Testes - Fluxo de Autenticação

## Estado Atual ✅
O fluxo de autenticação foi corrigido. A tela de login agora é a **barreira obrigatória** para entrar no app.

---

## 🚀 Como Testar

### Pré-requisitos
- App Expo instalado no dispositivo/emulador
- Projeto buildado com `npm install`

### Teste 1: Fresh Install
**Objetivo:** Verificar que login aparece ao abrir app pela primeira vez

```bash
# 1. Limpar cache e estado do app
cd front-end/kod-finance
npm start -- --clear

# 2. Escanear QR code com dispositivo

# 3. Aguardar app carregar
```

**Resultado esperado:**
- ✅ **Tela de login aparece** (não dashboard)
- Campo "Entrar" ativo, campo "Cadastrar" visível
- Botão "Login com Google" renderizado

---

### Teste 2: Login com Email/Senha
**Objetivo:** Verificar autenticação básica e redirecionamento

1. Na tela de login:
   - `Email:` insira `teste@example.com`
   - `Senha:` insira `senha123` (6+ caracteres)
   - Clique "Entrar" (aba "Entrar" ativa)

2. **Validações que devem aparecer:**
   - ❌ Email inválido (ex: `teste`) → mensagem de erro
   - ❌ Senha < 6 caracteres (ex: `123`) → mensagem de erro
   - ✅ Email válido + senha válida → "Login realizado com sucesso!"

3. **Redirecionamento:**
   - Após sucesso, **deve aparecer AUTOMATICAMENTE:**
     - Dashboard (aba Página Inicial)
     - Navegar para Explorar / Metas / Configurações deve funcionar
     - Usuário não precisa fazer nada

**Resultado esperado:**
- ✅ Após 0,7s vê "Login realizado com sucesso!"
- ✅ App navega para dashboard (tabs)
- ✅ Pode navegar livremente entre abas

---

### Teste 3: Logout e Re-login
**Objetivo:** Verificar que logout retorna à login e permite novo login

1. Na aba Configurações:
   - Role para baixo até "Segurança"
   - Clique no botão **"Sair"**

2. **Resultado imediato:**
   - ✅ Tela de login **reaparece imediatamente**
   - Formulário limpo (campos vazios)
   - Posição em aba "Entrar"

3. **Fazer login novamente:**
   - Insira novo email (ex: `outro@email.com`)
   - Insira senha válida
   - Clique "Entrar"
   - ✅ Deve funcionar sem bloqueios

---

### Teste 4: Trocar entre Login e Cadastro
**Objetivo:** Verificar animação e estados das abas

1. Clique em **"Cadastrar"** (aba direita)

2. **Validações:**
   - Campo **"Nome"** aparece
   - Campos email/senha permanecem
   - Botão "Entrar" muda para "Cadastrar"
   - "Esqueceu senha?" desaparece

3. **Preencher:**
   - `Nome:` `João Silva`
   - `Email:` `joao@example.com`
   - `Senha:` `senha456`
   - Clique "Cadastrar"

4. **Resultado:**
   - ✅ "Conta criada com sucesso!"
   - ✅ App navega para dashboard
   - ✅ Em Configurações, vê nome "João Silva"

5. **Voltar para Login:**
   - Clique aba "Entrar"
   - ✅ Anima de volta
   - Campo "Nome" desaparece
   - "Esqueceu senha?" reaparece

---

### Teste 5: Google Sign-In ⚠️
**Pré-requisito:** `.env` preenchido com Google Client IDs

```
GOOGLE_EXPO_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
```

1. Na tela de login, clique **"Login com Google"**

2. **Se IDs faltam:**
   - ❌ Botão fica desabilitado (opacidade 60%)
   - Mensagem no console: credenciais faltam

3. **Com IDs corretos:**
   - Abre tela de login Google
   - Seleciona conta Google
   - ✅ Busca nome/email do perfil
   - ✅ Faz `signIn()` automático
   - ✅ Navega para dashboard

---

### Teste 6: AsyncStorage Persistence
**Objetivo:** Verificar que logout remove credenciais e login mantém estado

Teste via debug console (React Native Debugger ou Reactotron):

```javascript
// Após login bem-sucedido:
AsyncStorage.getItem('@kod_finance:loggedIn')
// Resultado: 'true' ✅

// Após logout:
AsyncStorage.getItem('@kod_finance:loggedIn')
// Resultado: null ou 'false' ✅

// Usuário ainda salvo:
AsyncStorage.getItem('@kod_finance:user')
// Resultado: '{"name":"João","email":"joao@email.com"}'
```

---

## 🔍 Checklist de Validação

Marque conforme testa:

### Login/Signup
- [ ] Fresh install → login aparece
- [ ] Email inválido → erro visível
- [ ] Senha < 6 chars → erro visível
- [ ] Dados válidos → "sucesso" message
- [ ] Após sucesso → dashboard renderiza
- [ ] Botão Google não desabilitado (com IDs) / desabilitado (sem IDs)
- [ ] Trocar aba Entrar ↔ Cadastrar anima suavemente
- [ ] Campo "Nome" aparece/desaparece conforme modo

### Navigation/Routing
- [ ] Todos os 4 tabs funcionam em dashboard
- [ ] Voltar de qualquer tela leva aos tabs (não login)
- [ ] Dados da transação/meta persistem ao navegar

### Logout/Reauth
- [ ] Botão "Sair" em Configurações funciona
- [ ] Após logout → login aparece IMEDIATAMENTE
- [ ] Formulário limpo após logout
- [ ] Pode fazer novo login sem erros
- [ ] AsyncStorage `loggedIn` é false após logout

### Theme
- [ ] Cores aplicadas conforme tema (claro/escuro)
- [ ] Switch tema em Configurações funciona
- [ ] Logout mantém preferência de tema

---

## 🐛 Troubleshooting

### Problema: Fresh install mas vai direto ao dashboard
**Causa:** AsyncStorage contém `@kod_finance:loggedIn = 'true'` de session anterior

**Solução:**
```bash
# Abra device/emulator e execute:
adb shell pm clear com.seu.app  # Android
# OU
xcrun simctl erase all           # iOS sim
```

Ou limpe via Expo:
```bash
expo start --clear
```

---

### Problema: Google Sign-In não funciona
**Verificar:**
1. `.env` tem client IDs preenchidos?
2. `Constants.expoConfig.extra` carrega valores? (debug em console)
3. Google Cloud Console autoriza seu bundle ID?

**Debug:**
```javascript
import Constants from 'expo-constants';
console.log('Google Expo ID:', Constants.expoConfig?.extra?.GOOGLE_EXPO_CLIENT_ID);
```

---

### Problema: Logout não retorna ao login
**Causa:** Mudança de `isLoggedIn` não detectada por `_layout.tsx`

**Verificar:**
```javascript
// Em AppContext.tsx, validar que signOut() chama:
setIsLoggedIn(false);
setUser({ name: '', email: '' });
```

---

## 📊 Fluxo Visual

```
┌─────────────────────┐
│   App Inicia        │
└──────────┬──────────┘
           │
           ▼
     ┌──────────────────┐
     │ _layout.tsx      │
     │ Carrega Context  │
     └────────┬─────────┘
              │
              ▼
        ┌─────────────┐
        │isLoggedIn?  │
        └──┬──────┬───┘
         YES    NO
          │      │
          ▼      ▼
       [TABS]  [LOGIN]
         │      │
         └──┬───┘
            │
         ┌──▼───┐
         │CLICK │
         │"SAIR"│
         └──┬───┘
            │
            ▼
      signOut() ─→ isLoggedIn=false
            │
            ▼
         [LOGIN]
```

---

## ✅ Próxima Etapa
Se todos os testes passarem:
1. Configurar Google OAuth com client IDs reais
2. Implementar backend para salvar credenciais
3. Adicionar password recovery endpoint
4. Testar em dispositivo real (não apenas emulator)

