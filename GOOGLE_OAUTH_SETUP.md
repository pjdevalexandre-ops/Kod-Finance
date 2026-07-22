# 🔑 Como Configurar Google OAuth para Expo

## ⚡ Quick Start

Se o app estava dando erro de AuthSession proxy, a correção já foi aplicada:
- ✅ `useProxy: false` adicionado em `app/index.tsx`
- ✅ `.env` criado (mas vazio - precisa preencher)

Agora o app vai rodar, mas o botão "Login com Google" ficará **desabilitado** até você adicionar as credenciais.

---

## 📋 Passo-a-Passo para Obter Client IDs

### 1. Acessar Google Cloud Console
1. Vá para [console.cloud.google.com](https://console.cloud.google.com)
2. Faça login com sua conta Google
3. Crie um novo projeto:
   - Clique em "Selecionar um projeto" (topo)
   - Clique "NOVO PROJETO"
   - Nome: `Kod Finance` (ou preferido)
   - Clique "CRIAR"

### 2. Habilitar Google+ API
1. Na barra de busca (topo), procure por: `Google+ API`
2. Selecione "Google+ API" dos resultados
3. Clique "ATIVAR"

### 3. Criar OAuth Consent Screen
1. No menu esquerdo, vá para: **APIs e Serviços → Tela de Consentimento OAuth**
2. Selecione:
   - Tipo de usuário: **Externo**
   - Clique "CRIAR"
3. Preencha:
   - **Nome do app:** Kod Finance
   - **Email de suporte:** seu-email@gmail.com
   - **Email de contato do desenvolvedor:** seu-email@gmail.com
4. Clique "SALVAR E CONTINUAR" (todas as abas)

### 4. Criar Credenciais OAuth 2.0
1. No menu esquerdo: **APIs e Serviços → Credenciais**
2. Clique "+ CRIAR CREDENCIAIS" → **ID do cliente OAuth**
3. **Primeiro, selecione tipo de aplicativo:**
   - Tipo: **Aplicativo para computador** (para Web)
   - Clique "CRIAR"
   - Copie: `GOOGLE_WEB_CLIENT_ID`

4. Repita para **Aplicativo para Android:**
   - Tipo: **Android**
   - Nome do pacote: `com.seu-app.app` (confira em `app.json` > `android.package`)
   - Hash SHA-1: [Veja abaixo como obter]
   - Clique "CRIAR"
   - Copie: `GOOGLE_ANDROID_CLIENT_ID`

5. Repita para **Aplicativo para iOS:**
   - Tipo: **iOS**
   - Bundle ID: `com.seu-app` (confira em `app.json` > `ios.bundleIdentifier`)
   - Clique "CRIAR"
   - Copie: `GOOGLE_IOS_CLIENT_ID`

### 5. Client ID para Expo
Para `GOOGLE_EXPO_CLIENT_ID`, use o ID do tipo **Aplicativo para computador** (mesmo do Web).

---

## 🔍 Como Obter SHA-1 Hash (Android)

Se precisar do SHA-1 para Android:

```bash
cd front-end/kod-finance

# Opção 1: Via eas
eas credentials show

# Opção 2: Via Android Keystore local
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

---

## 📝 Preenchendo o `.env`

Após obter todos os IDs, preencha o arquivo `.env`:

```
GOOGLE_EXPO_CLIENT_ID=seu-id-web.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=seu-id-ios.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=seu-id-android.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_ID=seu-id-web.apps.googleusercontent.com
```

**Exemplo:**
```
GOOGLE_EXPO_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=987654321-xyznop.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=555555555-uvwxyz.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
```

---

## 🧪 Testando

Após preencher `.env`:

```bash
# Reiniciar Expo
npm start -- --clear

# Ou se usar yarn:
yarn start --clear
```

Agora:
1. ✅ Botão "Login com Google" deve estar **habilitado**
2. ✅ Clicar deve abrir tela de login Google
3. ✅ Após selecionar conta, deve fazer login no app

---

## 🆘 Troubleshooting

### Botão Google ainda desabilitado?
```javascript
// Debug: Ver se IDs estão sendo carregados
import Constants from 'expo-constants';
console.log('Google IDs:', Constants.expoConfig?.extra);
```

Se vazio, verifique:
- ✓ `.env` existe na raiz de `front-end/kod-finance/`?
- ✓ `app.config.js` está executando `dotenv.config()`?
- ✓ Variáveis têm prefixo `GOOGLE_`?

Reinicie o app com `npm start -- --clear`

### Erro "Invalid client"?
- Verifique que **Bundle ID/Package** no Google Cloud Console **bate** com `app.json`

### Erro de consentimento?
- Volte a **Tela de Consentimento OAuth**
- Verifique **Domínios autorizados**
- Para teste local: deixe vazio ou use `localhost`

---

## 📚 Referências
- [Expo GoogleSignIn](https://docs.expo.dev/build-reference/eas-build-configuration/#credentialssource)
- [Google Cloud Console](https://console.cloud.google.com)
- [OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)

