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
  /**
   * Executa OCR de alta precisão usando o Google Cloud Vision API
   * @param {string} imageBase64 
   * @returns {Promise<string>} O texto extraído do documento fiscal
   */
  async performOcr(imageBase64) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Chave de API do Gemini/Google Cloud não configurada.');
    }

    const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    const requestBody = {
      requests: [
        {
          image: {
            content: imageBase64
          },
          features: [
            {
              type: 'TEXT_DETECTION'
            }
          ]
        }
      ]
    };

    console.log('Solicitando OCR para Google Cloud Vision API...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Google Cloud Vision API HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const responses = data.responses || [];
    if (responses.length === 0 || !responses[0].fullTextAnnotation) {
      throw new Error('Nenhum texto detectado na imagem pelo Google Cloud Vision.');
    }

    return responses[0].fullTextAnnotation.text;
  }

  /**
   * Valida se os dados extraídos atendem aos critérios de consistência do Kod Finance
   * @param {object} parsed 
   * @returns {boolean} True se for consistente, False caso contrário
   */
  validateReceiptSchema(parsed) {
    if (!parsed) return false;
    
    // Deve conter pelo menos descrição ou valor para ser útil
    const hasDesc = parsed.description !== undefined && parsed.description !== null && String(parsed.description).trim().length > 0;
    const hasVal = parsed.value !== undefined && parsed.value !== null && parseFloat(parsed.value) > 0;

    if (!hasDesc && !hasVal) {
      return false;
    }

    // Se tiver valor, valida se é número válido positivo
    if (parsed.value !== null && parsed.value !== undefined) {
      const val = parseFloat(parsed.value);
      if (isNaN(val) || val < 0) {
        return false;
      }
    }

    // Data (opcional, tenta formatar ou anular se for inválida)
    if (parsed.date !== null && parsed.date !== undefined && parsed.date !== '') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
        // Tenta converter formato brasileiro DD/MM/AAAA para YYYY-MM-DD
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(parsed.date)) {
          const parts = parsed.date.split('/');
          parsed.date = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
          parsed.date = null; // ignora data mal formatada
        }
      }
    } else {
      parsed.date = null;
    }

    // Categoria opcional, se inválida substitui por 'other'
    const allowedCategories = ['food', 'transport', 'shopping', 'health', 'education', 'bills', 'entertainment', 'salary', 'transfer', 'investment', 'other'];
    if (!parsed.category || !allowedCategories.includes(parsed.category)) {
      parsed.category = 'other';
    }

    return true;
  }

  /**
   * Envia a imagem do recibo em base64 para a API do Gemini
   * e extrai os dados estruturados em JSON
   * @param {string} imageBase64 
   * @param {string} mimeType 
   * @returns {Promise<object>}
   */
  async scanReceipt(imageBase64, mimeType) {
    let ocrText = '';
    let ocrSuccess = false;

    // Etapa 2: OCR Especializado
    try {
      ocrText = await this.performOcr(imageBase64);
      ocrSuccess = true;
      console.log('OCR concluído com sucesso. Texto extraído:\n', ocrText);
    } catch (ocrErr) {
      console.warn('Falha no Google Vision OCR. Usando fallback direto do Gemini Vision:', ocrErr.message);
    }

    // Etapa 3: Enviar Texto + Imagem para o Gemini
    const systemInstruction = `Você é um especialista altamente preciso em ler documentos fiscais brasileiros (NFC-e, SAT, recibos e comprovantes de pagamento).
Sua missão é extrair informações estruturadas confiáveis da imagem da nota fiscal e/ou do texto retornado pelo scanner OCR.

Utilize tanto a imagem quanto o texto OCR para encontrar as informações mais confiáveis. O texto do OCR pode conter falhas de digitação ou símbolos trocados devido à perspectiva; use a imagem para validar e desempatar.

### Prioridades de Extração:
1. **Nome do estabelecimento (description)**:
   - Procure pelo nome fantasia limpo no topo do cupom (ex: "McDonald's", "Carrefour", "Posto Ipiranga", "Droga Raia").
   - Limpe sufixos corporativos como "S.A.", "LTDA", "CONVENIENCIA", "AUTO POSTO", etc.
2. **Valor TOTAL da compra (value)**:
   - Identifique o valor total final real pago pelo cliente. Considere apenas valores próximos aos termos: "TOTAL", "TOTAL R$", "VALOR A PAGAR", "TOTAL DA VENDA".
   - NUNCA utilize "Subtotal", "Troco", "Valor Recebido", "Desconto" ou valores de formas de pagamento não realizadas.
   - Retorne sempre em formato de número decimal de ponto flutuante (ex: 154.87).
3. **Data da compra (date)**:
   - Identifique a data da transação no formato DD/MM/AAAA ou DD/MM/YY. Converta-a sempre para o formato ISO "YYYY-MM-DD" (ex: "2026-07-23").
   - Se nenhuma data for encontrada, retorne null.
4. **Categoria financeira (category)**:
   - Escolha APENAS uma das seguintes categorias permitidas baseado no tipo do estabelecimento e itens comprados:
     * "food" (Alimentação/Supermercado/Restaurante/Ifood)
     * "transport" (Combustível/Gasolina/Uber/Metrô/Pedágio)
     * "shopping" (Roupas/Lojas de departamento/Eletrônicos/Objetos)
     * "health" (Farmácia/Drogaria/Consultas/Remédios)
     * "education" (Papelaria/Livros/Cursos/Escola)
     * "bills" (Contas fixas/Água/Luz/Internet/Gás)
     * "entertainment" (Lazer/Cinema/Shows/Spotify/Netflix)
     * "salary" (Salários/Entradas)
     * "transfer" (Transferências enviadas/recebidas)
     * "investment" (Aplicações/Investimentos)
     * "other" (Outros/Diversos)

### Regras importantes:
- Nunca invente ou assuma dados que não estejam legíveis. Se uma informação não for identificável com segurança, preencha com null.
- Sua resposta deve ser EXCLUSIVAMENTE um objeto JSON válido, sem qualquer bloco de código markdown (NÃO use \`\`\`json ou \`\`\`), sem explicações adicionais antes ou depois da estrutura JSON.

Formato do JSON esperado:
{
  "description": "Nome do Estabelecimento",
  "value": 154.87,
  "category": "food",
  "date": "2026-07-23"
}`;

    // Monta os conteúdos para o Gemini
    const contents = [];
    contents.push({
      inlineData: {
        data: imageBase64,
        mimeType: mimeType
      }
    });

    let promptText = '';
    if (ocrSuccess) {
      promptText = `Abaixo está o texto extraído pelo OCR de alta precisão:\n---\n${ocrText}\n---\nCombine a leitura da imagem e os dados do texto OCR acima para gerar a resposta.`;
    } else {
      promptText = `Analise a imagem da nota fiscal fornecida para extrair os dados.`;
    }
    contents.push(promptText);

    // Etapa 3 & 4: Chamada com validação e Auto-Retry
    let resultJson = null;
    let attempts = 2; // Tenta 2 vezes (1x original + 1x auto-retry se falhar)

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        console.log(`Tentativa ${attempt} de processamento com o Gemini...`);
        const modelName = 'gemini-2.5-flash';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const responsePromise = this.ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: {
            systemInstruction: systemInstruction
          }
        });

        const response = await Promise.race([
          responsePromise,
          new Promise((_, reject) => {
            controller.signal.addEventListener('abort', () => reject(new Error('TIMEOUT_ERROR')));
          })
        ]);

        clearTimeout(timeoutId);

        if (!response || !response.text) {
          throw new Error('Resposta vazia da IA.');
        }

        const rawText = response.text.trim();
        console.log('Resposta bruta do Gemini:', rawText);

        const cleanText = rawText
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/, '')
          .trim();

        const parsed = JSON.parse(cleanText);

        // Validação de consistência do Schema
        const isValid = this.validateReceiptSchema(parsed);
        if (isValid) {
          resultJson = parsed;
          break; // Sucesso! Sai do loop de tentativas
        } else {
          throw new Error('Falha na validação de consistência dos dados do cupom.');
        }
      } catch (err) {
        console.warn(`Falha na tentativa ${attempt}:`, err.message);
        if (attempt === 1) {
          console.log('Iniciando Auto-Retry com prompt corretivo...');
          // Adiciona prompt de correção para a segunda tentativa
          contents.push(`ATENÇÃO: A tentativa anterior falhou na validação. Certifique-se de retornar um JSON válido com descrição não vazia, valor de compra maior que zero (se não houver valor total claro, retorne null em vez de zero ou chute), categoria da lista permitida e data ISO YYYY-MM-DD válida.`);
        }
      }
    }

    // Se falhar nas duas tentativas, monta uma resposta fallback segura com nulls
    const finalData = resultJson || {
      description: null,
      value: null,
      category: 'other',
      date: null
    };

    // Mapeia categorias do prompt para categorias do Frontend
    const categoryMapping = {
      'food': 'food',
      'transport': 'transport',
      'shopping': 'clothing', // 'shopping' mapeia para 'clothing' (vestuário)
      'health': 'health',
      'education': 'education',
      'bills': 'housing', // 'bills' mapeia para 'housing' (moradia)
      'entertainment': 'leisure', // 'entertainment' mapeia para 'leisure' (lazer)
      'salary': 'salary',
      'transfer': 'other', // 'transfer' mapeia para 'other'
      'investment': 'investment',
      'other': 'other'
    };

    const finalCategory = categoryMapping[finalData.category] || 'other';

    return {
      description: finalData.description,
      value: finalData.value,
      category: finalCategory,
      date: finalData.date
    };
  }

  /**
   * Analisa o histórico financeiro do usuário e gera uma previsão inteligente de gastos para o próximo mês
   * @param {object} data { transactions, recurringBills, budgets }
   * @returns {Promise<object>} Previsão e análise inteligente
   */
  async getExpensesPrediction({ transactions, recurringBills, budgets }) {
    // Saneia e resume os dados para economizar tokens
    const recentExpenses = (transactions || [])
      .filter(t => t.type === 'expense')
      .slice(0, 40)
      .map(t => ({
        description: t.description,
        value: t.value,
        categoryId: t.categoryId,
        date: t.date ? t.date.substring(0, 10) : ''
      }));

    const billsSummary = (recurringBills || []).map(b => ({
      description: b.description,
      value: b.value,
      categoryId: b.categoryId,
      dueDay: b.dueDay
    }));

    const budgetsSummary = (budgets || []).map(b => ({
      categoryId: b.categoryId,
      limitAmount: b.limitAmount
    }));

    const promptText = `Você é um analista financeiro pessoal de Inteligência Artificial para o aplicativo Kod Finance.
Analise os dados financeiros do usuário para o mês atual e gere uma previsão de gastos variáveis e conselhos inteligentes para o PRÓXIMO MÊS.

### Dados do Usuário:
1. **Últimas Despesas Variáveis**:
${JSON.stringify(recentExpenses, null, 2)}

2. **Contas Fixas / Recorrentes Cadastradas**:
${JSON.stringify(billsSummary, null, 2)}

3. **Limites de Orçamentos por Categoria**:
${JSON.stringify(budgetsSummary, null, 2)}

### Sua tarefa:
1. Analise o padrão de gastos variáveis recentes (comida, transporte, lazer, etc.).
2. Com base nesses gastos e nos limites de orçamento, calcule uma estimativa numérica realista do total de **Gastos Variáveis** que o usuário terá no próximo mês (ex: 850.00).
3. Escreva uma análise curta, motivadora e direta (máximo 120 caracteres) em português, aconselhando o usuário ou prevendo uma economia/alerta (ex: "Sua média em Lazer está alta. Se reduzir 10% nas saídas, economizará R$ 150 no próximo mês.").
4. Classifique o nível de risco financeiro atual do usuário: "low" (gasta menos que o orçamento), "medium" (próximo dos limites) ou "high" (ultrapassando limites).

Você deve responder APENAS com um objeto JSON válido, sem formatação markdown (como blocos de código \`\`\`json), sem textos adicionais antes ou depois.
Estrutura esperada:
{
  "predictedVariable": 850.00,
  "aiAnalysis": "Texto curto da análise aqui",
  "riskLevel": "low"
}`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [promptText]
      });

      if (response && response.text) {
        const rawText = response.text.trim();
        const cleanText = rawText
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/, '')
          .trim();

        const parsed = JSON.parse(cleanText);
        return {
          predictedVariable: typeof parsed.predictedVariable === 'number' ? parsed.predictedVariable : 0,
          aiAnalysis: parsed.aiAnalysis || 'Continue acompanhando seus gastos diários para manter o controle.',
          riskLevel: ['low', 'medium', 'high'].includes(parsed.riskLevel) ? parsed.riskLevel : 'low'
        };
      }
    } catch (e) {
      console.error('Erro na chamada do Gemini para previsão:', e.message);
    }

    // Fallback padrão se falhar
    return {
      predictedVariable: 0,
      aiAnalysis: 'Mantenha a regularidade nos seus lançamentos para que a IA possa gerar conselhos personalizados.',
      riskLevel: 'low'
    };
  }
}

module.exports = new GeminiService();
