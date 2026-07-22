import { CHAT_URL } from './config';

/**
 * Consome o endpoint POST /api/ai/chat do backend para obter respostas da IA.
 * Requisito: Utiliza fetch para realizar a chamada HTTP.
 * @param {string} message - Mensagem sanitizada contendo o prompt do usuário ou dados.
 * @returns {Promise<string>} O texto da resposta gerado pela IA.
 */
export async function sendMessageToAI(message: string): Promise<string> {
  const url = CHAT_URL;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error || `Erro de rede (HTTP ${response.status})`;
      throw new Error(errorMsg);
    }

    if (data.success === false) {
      throw new Error(data.error || 'Erro desconhecido processado pelo servidor de IA.');
    }

    return data.response;
  } catch (error: any) {
    console.error('Erro de comunicação em sendMessageToAI:', error);
    throw new Error(error.message || 'Erro de conexão com o servidor de inteligência artificial.');
  }
}

/**
 * Função adaptadora compatível com a chamada original do chat do frontend (chat-ai.tsx).
 * Ela empacota o contexto financeiro e o prompt em um único corpo de mensagem
 * para ser processado no backend de forma transparente.
 * @param {string} promptText - A dúvida ou comando digitado pelo usuário.
 * @param {string} contextText - Resumo estruturado das transações, metas e saldos.
 * @returns {Promise<string>} Resposta gerada pela inteligência artificial.
 */
export async function askKodAI(promptText: string, contextText: string): Promise<string> {
  const combinedMessage = `
[CONTEXTO FINANCEIRO DO USUÁRIO]
${contextText}

[DÚVIDA DO USUÁRIO]
"${promptText}"
  `.trim();

  return sendMessageToAI(combinedMessage);
}
