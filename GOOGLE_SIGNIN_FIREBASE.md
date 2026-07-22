# 🔐 Google Sign-In com Firebase - Kod Finance

## Status ✅
O Google Sign-In foi migrado de `expo-auth-session` para `@react-native-google-signin/google-signin`.

---

## 📦 Dependências Instaladas

Você precisa executar:

```bash
cd front-end/kod-finance
npm install firebase @react-native-google-signin/google-signin
```

---

## 🏗️ Arquitetura

### 1. Arquivo de Configuração: `config/firebase.ts`

```typescript
// Inicializa Firebase com credenciais do Google Cloud
// Usa o Web Client ID do .env
// Persiste autenticação em AsyncStorage

const firebaseConfig = {
  apiKey: GOOGLE_WEB_CLIENT_ID,  // De .env
  projectId: 'kod-finance',
  // Outras configs...
};

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
```

**Por que Firebase?**
- Gerencia autenticação de forma segura
- Persiste sessão automaticamente
- Compatível com React Native + Expo
- Integração fácil com Google OAuth

---

### 2. Inicialização do Google Sign-In: `app/index.tsx`

```typescript
function initializeGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,  // De .env
    scopes: ['profile', 'email'],
    offlineAccess: true,
  });
}
```

**O que faz:**
- Configura o Google SDK com seu Web Client ID
- Define escopos (qual dados pedir: nome e email)
- Permite offline access

---

### 3. Fluxo de Login

```
Usuário clica "Login com Google"
    ↓
handleGoogleSignIn() é chamado
    ↓
GoogleSignin.signIn() abre tela de login Google
    ↓
Usuário seleciona conta Google
    ↓
Extrai nome e email
    ↓
signIn(name, email) do AppContext
    ↓
AppContext atualiza isLoggedIn = true
    ↓
AsyncStorage persiste dados
    ↓
_layout.tsx detecta mudança
    ↓
App navega para dashboard automaticamente
```

---

## 🔑 Variáveis de Ambiente

Seu `.env` deve ter:

```
GOOGLE_WEB_CLIENT_ID=973004557116-krld84n9o3uvf2kivsgh05e6i59l68se.apps.googleusercontent.com
GOOGLE_EXPO_CLIENT_ID=...
GOOGLE_IOS_CLIENT_ID=...
GOOGLE_ANDROID_CLIENT_ID=...
```

---

## 🧪 Testando

### Login Local (Email/Senha)
1. Clique "Cadastrar"
2. Preencha nome, email, senha (6+ chars)
3. Clique "Criar conta"
4. Deve ir para dashboard

### Login com Google
1. Clique "Login com Google"
2. Abre tela de login Google
3. Selecione sua conta
4. Deve ir para dashboard

### Logout
1. Configurações → Sair
2. Volta para tela de login

---

## 📋 Diferenças da Implementação Anterior

| Funcionalidade | Antes (expo-auth-session) | Agora (@react-native-google-signin) |
|----------------|---------------------------|-------------------------------------|
| Inicialização | `Google.useAuthRequest()` | `GoogleSignin.configure()` |
| Sign-In | `await promptAsync()` | `await GoogleSignin.signIn()` |
| Dados do usuário | Via fetch à API Google | Direto do `userInfo` |
| Erro handling | `response.type` | `statusCodes.*` |
| Persistência | Manual | Automática do SDK |

---

## 🎯 Checklist

- [ ] Executou `npm install firebase @react-native-google-signin/google-signin`
- [ ] `.env` preenchido com `GOOGLE_WEB_CLIENT_ID`
- [ ] `config/firebase.ts` criado
- [ ] `app/index.tsx` atualizado
- [ ] `npm start -- --clear` sem erros
- [ ] Botão "Login com Google" funciona
- [ ] Login local (email/senha) funciona
- [ ] Logout funciona

---

## 🚀 Próximos Passos

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Rodar o app:**
   ```bash
   npm start -- --clear
   ```

3. **Testar login:**
   - Cadastro com email/senha ✅
   - Google Sign-In ✅
   - Logout ✅

---

## 📞 Suporte

Se tiver erros:
1. Verifique se `GOOGLE_WEB_CLIENT_ID` está no `.env`
2. Verifique se as dependências foram instaladas: `npm ls firebase @react-native-google-signin/google-signin`
3. Limpe cache: `npm start -- --clear`
4. Verifique logs: Abra console do React Native Debugger/Reactotron

