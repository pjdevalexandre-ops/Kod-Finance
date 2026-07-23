const { GoogleGenAI } = require('@google/genai');

class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('AVISO: GEMINI_API_KEY não foi definida nas variáveis de ambiente (.env).');
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.priorityModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];
  }

  /**
   * Consulta a API do Google Gemini para retornar todos os modelos suportados pela chave do usuário.
   * Filtra e retorna a lista de modelos ordenados por prioridade que realmente suportam generateContent.
   * @returns {Promise<string[]>} Uma lista de identificadores de modelos suportados por ordem de prioridade
   */
  async getSupportedModels() {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return this.priorityModels;

      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Status HTTP ${response.status}`);
      }

      const data = await response.json();
      const modelsList = data.models || [];

      // Filtra modelos que suportam geração de conteúdo
      const apiSupportedModels = modelsList
        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));

      console.log('Modelos suportados retornados pela API do Gemini:', apiSupportedModels);

      // Reordena e filtra a nossa lista de prioridade com base nos modelos reais da API
      const matchedModels = this.priorityModels.filter(m => apiSupportedModels.includes(m));

      // Adiciona quaisquer outros modelos que suportem generateContent no final como fallback
      const otherModels = apiSupportedModels.filter(m => !this.priorityModels.includes(m));

      return [...matchedModels, ...otherModels];
    } catch (e) {
      console.warn('[GeminiService] Falha ao listar modelos dinamicamente via API:', e.message);
      // Retorna lista padrão de fallback
      return this.priorityModels;
    }
  }

  /**
   * Envia um prompt para a API do Gemini e retorna o texto da resposta.
   * Requisito: Tratamento completo de timeout, erro 429, rede, autenticação e erros internos.
   * @param {string} prompt 
   * @returns {Promise<string>}
   */
  async generateResponse(prompt) {
    let lastError = null;
    let isRateLimited = false;
    let isAuthError = false;

    // Obtém a lista de modelos suportados em tempo real ou por cache
    const activeModels = await this.getSupportedModels();

    // Loop de tentativas com fallbacks de modelos ativos
    for (const modelName of activeModels) {
      try {
        console.log(`Tentando gerar conteúdo com o modelo: ${modelName}`);
        
        // Timeout de 15 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const responsePromise = this.ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });

        const response = await Promise.race([
          responsePromise,
          new Promise((_, reject) => {
            controller.signal.addEventListener('abort', () => {
              reject(new Error('TIMEOUT_ERROR'));
            });
          })
        ]);

        clearTimeout(timeoutId);

        if (response && response.text) {
          return response.text.trim();
        }
        
        throw new Error('EMPTY_RESPONSE');
      } catch (error) {
        console.warn(`Tentativa com o modelo ${modelName} falhou:`, error.message || error);
        lastError = error;

        const errorMsg = error.message || '';
        
        // Se for erro de modelo inexistente, não suportado ou bloqueado para novos usuários (404 / 400), pula para o próximo
        if (error.status === 404 || error.status === 400 || errorMsg.includes('NOT_FOUND') || errorMsg.includes('is no longer available') || errorMsg.includes('not supported') || errorMsg.includes('not found')) {
          console.warn(`Modelo ${modelName} indisponível ou incompatível. Tentando próximo modelo...`);
          continue;
        }

        // Se for erro 429 (cota de requisições excedida)
        if (error.status === 429 || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('429') || errorMsg.includes('Quota exceeded')) {
          isRateLimited = true;
          continue;
        }

        // Se for erro de autenticação (API Key inválida)
        if (error.status === 400 && (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('API key not valid'))) {
          isAuthError = true;
          break;
        }
      }
    }

    // Retorno amigável dos erros tratados
    if (isAuthError) {
      return 'Erro de autenticação: A chave de API do Gemini (GEMINI_API_KEY) configurada no servidor é inválida ou expirou.';
    }

    if (isRateLimited) {
      return 'O assistente inteligente recebeu muitas perguntas no momento e atingiu a cota temporária de uso. Por favor, aguarde cerca de um minuto antes de tentar novamente.';
    }

    if (lastError) {
      const errMsg = lastError.message || '';
      if (errMsg === 'TIMEOUT_ERROR') {
        return 'Desculpe, a conexão com o assistente inteligente demorou mais que o esperado. Por favor, tente novamente em instantes.';
      }
      if (errMsg.includes('ENOTFOUND') || errMsg.includes('fetch failed') || errMsg.includes('Network Error')) {
        return 'Erro de rede: Não foi possível conectar aos servidores do Google Gemini. Verifique sua conexão.';
      }
    }

    return 'Desculpe, ocorreu um erro interno ao processar sua pergunta. Já fomos notificados e estamos ajustando. Tente novamente mais tarde!';
  }

  /**
   * Envia a imagem do recibo em base64 para a API do Gemini
   * e extrai os dados estruturados em JSON
   * @param {string} imageBase64 
   * @param {string} mimeType 
   * @returns {Promise<object>}
   */
  async scanReceipt(imageBase64, mimeType) {
    const promptText = `Você é um scanner de notas fiscais e recibos de compras do Kod Finance.
Analise a imagem da nota fiscal/recibo fornecida e extraia as seguintes informações:
1. Descrição/Estabelecimento (nome curto e limpo do local da compra, ex: "Supermercado Extra", "Posto Shell").
2. Valor total (em formato numérico, ex: 154.90).
3. Categoria de despesa mais adequada. Escolha APENAS uma das seguintes categorias padrão:
   - "housing" (Moradia/Aluguel/Luz/Internet)
   - "food" (Alimentação/Supermercado/Restaurantes)
   - "transport" (Transporte/Combustível/Uber/Metrô)
   - "education" (Educação/Livros/Cursos)
   - "health" (Saúde/Farmácia/Consultas)
   - "leisure" (Lazer/Cinema/Viagens)
   - "clothing" (Vestuário/Roupas/Sapatos)
   - "subscriptions" (Assinaturas de canais/streaming/Apps)
   - "other" (Outros/Despesas Diversas)
4. Data da compra (no formato ISO YYYY-MM-DD, ex: "2026-07-23". Se não encontrar a data, use a data atual no formato YYYY-MM-DD).

Você deve responder APENAS com um objeto JSON válido, sem formatação markdown (como blocos de código \`\`\`json), sem textos adicionais antes ou depois.
O JSON deve ter exatamente esta estrutura:
{
  "description": "Nome do Estabelecimento",
  "value": 154.90,
  "category": "food",
  "date": "2026-07-23"
}`;

    const activeModels = await this.getSupportedModels();
    let lastError = null;

    for (const modelName of activeModels) {
      try {
        console.log(`Tentando escanear recibo com o modelo: ${modelName}`);

        // Timeout de 25 segundos para processamento de imagem
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const responsePromise = this.ai.models.generateContent({
          model: modelName,
          contents: [
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType
              }
            },
            promptText
          ]
        });

        const response = await Promise.race([
          responsePromise,
          new Promise((_, reject) => {
            controller.signal.addEventListener('abort', () => {
              reject(new Error('TIMEOUT_ERROR'));
            });
          })
        ]);

        clearTimeout(timeoutId);

        if (response && response.text) {
          const rawText = response.text.trim();
          console.log('Resposta bruta do Gemini para escaneamento:', rawText);

          // Tenta extrair e converter para objeto JSON
          try {
            // Remove possíveis blocos de marcação markdown ```json ... ```
            const cleanText = rawText
              .replace(/^```json\s*/i, '')
              .replace(/```\s*$/, '')
              .trim();
            
            const parsed = JSON.parse(cleanText);

            // Validações básicas e saneamento
            return {
              description: parsed.description || 'Despesa Escaneada',
              value: typeof parsed.value === 'number' ? parsed.value : parseFloat(parsed.value) || 0,
              category: ['housing', 'food', 'transport', 'education', 'health', 'leisure', 'clothing', 'subscriptions', 'other'].includes(parsed.category) ? parsed.category : 'other',
              date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : new Date().toISOString().slice(0, 10)
            };
          } catch (jsonErr) {
            console.error('Falha ao parsear resposta do Gemini como JSON:', jsonErr);
            throw new Error('INVALID_JSON_RESPONSE');
          }
        }

        throw new Error('EMPTY_RESPONSE');
      } catch (error) {
        console.warn(`Tentativa de escaneamento com ${modelName} falhou:`, error.message || error);
        lastError = error;

        const errorMsg = error.message || '';
        if (error.status === 404 || error.status === 400 || errorMsg.includes('NOT_FOUND') || errorMsg.includes('is no longer available') || errorMsg.includes('not supported')) {
          continue; // Tenta o próximo modelo
        }
        break; // Outros erros sérios interrompem o loop
      }
    }

    // Se falhar, retorna um fallback vazio
    return {
      description: 'Nota Fiscal / Recibo',
      value: 0,
      category: 'other',
      date: new Date().toISOString().slice(0, 10),
      error: lastError ? lastError.message : 'Falha no processamento da imagem'
    };
  }
}

module.exports = new GeminiService();
