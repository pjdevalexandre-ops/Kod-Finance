import Constants from 'expo-constants';

// URL gerada pelo Render após o deploy (substitua pela sua URL final do Render se necessário)
const PRODUCTION_BACKEND_URL = "https://kod-finance-backend.onrender.com";

function getBaseUrl(): string {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      return `http://${ip}:3000`;
    }
    // Fallback padrão para IP local em desenvolvimento
    return 'http://192.168.1.8:3000';
  }
  return PRODUCTION_BACKEND_URL;
}

export const BACKEND_URL = getBaseUrl();
export const API_URL = `${BACKEND_URL}/api`;
export const CHAT_URL = `${BACKEND_URL}/api/ai/chat`;
export const SCAN_RECEIPT_URL = `${BACKEND_URL}/api/ai/scan-receipt`;
