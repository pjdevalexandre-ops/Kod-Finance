# 🤖 Prompt para IA - Configuração Google OAuth

## 🎯 Contexto do Projeto

Estou desenvolvendo um app financeiro em React Native com Expo chamado "Kod Finance". O app tem autenticação com login/cadastro por email e senha, mais opção de login com Google via `expo-auth-session`.

## 🔧 Problema Atual

O app está funcionando, mas o botão "Login com Google" fica desabilitado porque faltam as credenciais OAuth do Google. Preciso configurar:

- Google Cloud Console
- OAuth 2.0 Client IDs para múltiplas plataformas
- Arquivo `.env` preenchido

## 📋 O que preciso fazer

### 1. Configurar Google Cloud Console
- Criar projeto no Google Cloud
- Habilitar Google+ API
- Configurar OAuth Consent Screen
- Criar credenciais OAuth 2.0 para:
  - Web (para Expo)
  - Android
  - iOS

### 2. Preencher arquivo `.env`
Arquivo localizado em: `front-end/kod-finance/.env`

Conteúdo atual (vazio):
```
GOOGLE_EXPO_CLIENT_ID=
GOOGLE_IOS_CLIENT_ID=
GOOGLE_ANDROID_CLIENT_ID=
GOOGLE_WEB_CLIENT_ID=
```

### 3. Verificar configuração no código
Arquivo: `front-end/kod-finance/app.config.js`

Código atual:
```javascript
const dotenv = require('dotenv');
const appJson = require('./app.json');

dotenv.config();

module.exports = ({ config }) => ({
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    googleExpoClientId: process.env.GOOGLE_EXPO_CLIENT_ID || '',
    googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID || '',
    googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID || '',
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || '',
  },
});
```

## 📱 Informações do App

### Bundle IDs (de app.json):
- **Android Package:** `com.kodfinance.app`
- **iOS Bundle ID:** `com.kodfinance.app`

### Plataformas suportadas:
- Expo Go (desenvolvimento)
- Android físico/emulador
- iOS físico/simulador

## 🎯 Objetivo Final

Após configuração, o botão "Login com Google" deve:
1. Estar habilitado (não desabilitado)
2. Abrir tela de login Google ao clicar
3. Buscar perfil do usuário (nome, email)
4. Fazer login automático no app

## 🔍 Como testar

```bash
cd front-end/kod-finance
npm start -- --clear
```

Verificar no console:
```javascript
import Constants from 'expo-constants';
console.log('Google IDs:', Constants.expoConfig?.extra);
```

Deve mostrar os IDs preenchidos.

## 📚 Links Úteis

- [Google Cloud Console](https://console.cloud.google.com)
- [Expo Auth Session Docs](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)

## ❓ Dúvidas que posso ter

1. Como obter SHA-1 fingerprint para Android?
2. Qual Client ID usar para Expo vs Web?
3. Como configurar redirect URIs?
4. Como testar se está funcionando?

## 🚀 Próximos Passos

Por favor, me guie passo-a-passo através de:
1. Criação do projeto no Google Cloud Console
2. Configuração da OAuth Consent Screen
3. Criação dos Client IDs para cada plataforma
4. Preenchimento do arquivo `.env`
5. Teste da integração

Preciso que seja bem detalhado pois sou iniciante nessa parte de OAuth.