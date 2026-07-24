const geminiService = require('../services/gemini.service');

class AIController {
  /**
   * Endpoint handler para conversa com o consultor financeiro Kod AI
   * POST /api/ai/chat
   */
  async chat(req, res) {
    try {
      const { message } = req.body;

      // 1. Validação básica de entrada
      if (message === undefined || message === null) {
        return res.status(400).json({
          success: false,
          error: 'O campo "message" é obrigatório no corpo da requisição.'
        });
      }

      if (typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'A mensagem enviada deve ser uma string de texto válida.'
        });
      }

      // 2. Sanitização simples e remoção de espaços em branco nas pontas
      const sanitizedMessage = message.trim();

      // 3. Validação de prompt vazio
      if (sanitizedMessage.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'A mensagem não pode estar vazia.'
        });
      }

      // 4. Limitação do tamanho máximo do prompt (Segurança contra abusos / estouro de tokens)
      const MAX_PROMPT_LENGTH = 3000;
      if (sanitizedMessage.length > MAX_PROMPT_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `A mensagem é muito longa. Limite máximo permitido de ${MAX_PROMPT_LENGTH} caracteres.`
        });
      }

      // 5. Chamada ao serviço do Gemini
      const responseText = await geminiService.generateResponse(sanitizedMessage);

      return res.status(200).json({
        success: true,
        response: responseText
      });
    } catch (error) {
      console.error('Erro no AIController.chat:', error);
      return res.status(500).json({
        success: false,
        error: 'Ocorreu um erro inesperado no servidor ao processar a requisição.'
      });
    }
  }

  /**
   * Endpoint handler para escaneamento e extração de recibos
   * POST /api/ai/scan-receipt
   */
  async scanReceipt(req, res) {
    try {
      const { image, mimeType } = req.body;

      if (!image) {
        return res.status(400).json({
          success: false,
          error: 'O campo "image" contendo o base64 da imagem é obrigatório.'
        });
      }

      const finalMimeType = mimeType || 'image/jpeg';

      // Remove prefixos de data URI se existirem
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

      const result = await geminiService.scanReceipt(base64Data, finalMimeType);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Erro no AIController.scanReceipt:', error);
      return res.status(500).json({
        success: false,
        error: 'Ocorreu um erro inesperado no servidor ao escanear o recibo.'
      });
  /**
   * Endpoint handler para previsão de gastos baseado em IA
   * POST /api/ai/predict-expenses
   */
  async predictExpenses(req, res) {
    try {
      const { transactions, recurringBills, budgets } = req.body;

      const result = await geminiService.getExpensesPrediction({
        transactions: transactions || [],
        recurringBills: recurringBills || [],
        budgets: budgets || []
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Erro no AIController.predictExpenses:', error);
      return res.status(500).json({
        success: false,
        error: 'Ocorreu um erro inesperado no servidor ao processar a previsão de despesas.'
      });
    }
  }
}

module.exports = new AIController();
