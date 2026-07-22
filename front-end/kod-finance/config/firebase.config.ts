import { initializeApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurações do Firebase para o projeto Kod Finance.
// Essas credenciais são usadas diretamente no app e não precisam ficar no .env.
const firebaseConfig = {
  apiKey: 'AIzaSyDvM5X9S8Y5uw0L9PjDCtempfeSzb85D_I',
  authDomain: 'kod-finance-c6c69.firebaseapp.com',
  projectId: 'kod-finance-c6c69',
  storageBucket: 'kod-finance-c6c69.firebasestorage.app',
  messagingSenderId: '72693471989',
  appId: '1:72693471989:web:e4e6fa2c39b5617ef8c3bc',
  measurementId: 'G-3QNF15ZNHE',
};

// Inicializa o Firebase App apenas uma vez.
const firebaseApp = initializeApp(firebaseConfig);

// Inicializa o Firebase Auth com persistência nativa usando AsyncStorage para evitar avisos no Expo.
export const auth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export { firebaseApp, firebaseConfig };
