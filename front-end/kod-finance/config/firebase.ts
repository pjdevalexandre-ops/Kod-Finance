// Firebase Configuration
// Este arquivo inicializa o Firebase com as credenciais do Google Cloud

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import Constants from 'expo-constants';

// Obtém as credenciais do .env via app.config.js
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

// Configuração do Firebase
// Use variáveis de ambiente reais para o seu projeto Firebase
const firebaseConfig = {
  apiKey: extra.firebaseApiKey || process.env.FIREBASE_API_KEY || '',
  authDomain: extra.firebaseAuthDomain || process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: extra.firebaseProjectId || process.env.FIREBASE_PROJECT_ID || '',
  databaseURL: extra.firebaseDatabaseURL || process.env.FIREBASE_DATABASE_URL || '',
  storageBucket: extra.firebaseStorageBucket || process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: extra.firebaseMessagingSenderId || process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: extra.firebaseAppId || process.env.FIREBASE_APP_ID || '',
};

const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId,
);

if (!isFirebaseConfigured) {
  console.warn('Firebase não está completamente configurado. Verifique suas variáveis FIREBASE_ no .env.');
}

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa Auth
export const auth = getAuth(app);
export const firebaseConfigured = isFirebaseConfigured;

// Export para usar em outros arquivos
export { signInWithCredential, GoogleAuthProvider, signOut, onAuthStateChanged };
